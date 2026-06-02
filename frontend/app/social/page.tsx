"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { socket } from "../../socket"
import { authClient } from "@/lib/auth-client";
import AppPageShell from "@/components/AppPageShell";
import { contact }  from "./index"
import ProfileViewerModal from "@/components/organisms/social/ProfileViewer";
import { ConversationList } from "@/components/organisms/social/ConversationList";
import { MessageThread } from "@/components/organisms/social/MessageThread";
import { FriendRequestBanner } from "@/components/molecules/social/FriendRequestBanner";
import { DuelRequestBanner } from "@/components/molecules/social/DuelRequestBanner";
import { DuelWaitingModal } from "@/components/molecules/social/DuelWaitingModal";
import { type } from "./index"
import { emitGlobalError, emitGlobalNotification } from "@/lib/error-events";

const toSizeLabel = (bytes: number) => {
  if (bytes < 1024) return `${bytes} o`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} Ko`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} Mo`;
};

export default function SocialPage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [selectedUser, setSelectedUser] = useState("");
  const [message, setMessage] = useState("");
  const [draftAttachments, setDraftAttachments] = useState<type.Attachment[]>([]);
  const [inviteNotification, setInviteNotification] = useState<type.InviteNotification | null>(null);
  const [isInviting, setIsInviting] = useState(false);
  const [isAddContactModalOpen, setIsAddContactModalOpen] = useState(false);
  const [inviteUsername, setInviteUsername] = useState("");
  const [userPseudo, setUserPseudo] = useState<string | null>(null);
  const [currentMessages, setCurrentMessages] = useState<type.Messages[]>([]);
  const [users, setUsers] = useState<type.User[]>([]);
  const [inboxes, setInboxes] = useState<type.Inbox[]>([]);
  const [currentUser, setCurrentUser] = useState<type.User | null>(null);
	const [unreadMap, setUnreadMap] = useState<Record<string, number>>({});
  const [showProfileViewer, setShowProfileViewer] = useState(false);
  const [profileViewerUser, setProfileViewerUser] = useState<type.User | null>(null);
  const [request, setRequest] = useState(false);
  const [friendRequestSender, setFriendRequestSender] = useState<string | null>(null);
  const [isBlocked, setIsBlocked] = useState(false);
  const [hasBlocked, setHasBlocked] = useState(false);
  const [challenge, setChallenge] = useState(false);
  const [opponent, setOpponent] = useState<string | null>(null);
  const [waitingForDuelResponse, setWaitingForDuelResponse] = useState(false);
  const [duelChallengeTo, setDuelChallengeTo] = useState<string | null>(null);
  const [typer, setTyper] = useState<string | null>(null);
  const [typing, setTyping] = useState(false);
  const [unread, setUnread] = useState(false);
  const [customUserAvatar, setCustomUserAvatar] = useState<string | null>(null);
  const [expandedMessages, setExpandedMessages] = useState<Set<string>>(new Set());
  const [isLoadingOlderMessages, setIsLoadingOlderMessages] = useState(false);
  const [messageOffset, setMessageOffset] = useState(0);
  const [hasMoreMessages, setHasMoreMessages] = useState(true);


  const MAX_MESSAGE_LENGTH = 500;
  const MAX_DISPLAY_LENGTH = 200;

  let timeout: NodeJS.Timeout;
  const hasDraft = message.trim().length > 0 || draftAttachments.length > 0;

  // Helper functions for localStorage persistence
  const getConversationKey = (user1: string, user2: string) => {
    const sorted = [user1, user2].sort();
    return `message_read_status_${sorted[0]}_${sorted[1]}`;
  };

  const getStoredReadStatus = (user1: string, user2: string): Record<string, boolean> => {
    if (typeof window === 'undefined') return {};
    try {
      const key = getConversationKey(user1, user2);
      const stored = localStorage.getItem(key);
      return stored ? JSON.parse(stored) : {};
    } catch {
      return {};
    }
  };

  const saveReadStatusToStorage = (status: Record<string, boolean>) => {
    if (!currentUser || !selectedUser || typeof window === 'undefined') return;
    try {
      const key = getConversationKey(currentUser.name, selectedUser);
      localStorage.setItem(key, JSON.stringify(status));
    } catch {
      // Silent fail
    }
  };

  const saveChallengeToStorage = (opponentName: string | null) => {
    if (typeof window === 'undefined') return;
    try {
      if (opponentName) {
        localStorage.setItem("pending_challenge_opponent", opponentName);
      } else {
        localStorage.removeItem("pending_challenge_opponent");
      }
    } catch {
      // Silent fail
    }
  };

  const loadChallengeFromStorage = (): string | null => {
    if (typeof window === 'undefined') return null;
    try {
      return localStorage.getItem("pending_challenge_opponent");
    } catch {
      return null;
    }
  };

  // Load challenge from storage on component mount
  useEffect(() => {
    const storedOpponent = loadChallengeFromStorage();
    if (storedOpponent) {
      setChallenge(true);
      setOpponent(storedOpponent);
    }
  }, []);

  const toggleMessageExpanded = useCallback((messageId: string) => {
    setExpandedMessages((prev) => {
      const next = new Set(prev);
      if (next.has(messageId)) {
        next.delete(messageId);
      } else {
        next.add(messageId);
      }
      return next;
    });
  }, []);

  //fetch the current user pseudo
  useEffect(() => {
    const getUserData = async () => {
      const { data } = await authClient.getSession();
      if (data && data.user.name)
        setUserPseudo(data.user.name);
      else
        router.push("/not-connected");
    };
    getUserData();
  }, []);

  //load custom avatar from localStorage
  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const stored = localStorage.getItem('profileCustomAvatar');
      if (stored) {
        setCustomUserAvatar(stored);
      }
    } catch {
      // Silent fail
    }
    socket.on("online", async () => {
      const u = await contact.getUsers();
      setUsers(u);
    })

    socket.on("offline", async () => {
      const u = await contact.getUsers();
      setUsers(u);
    })
  }, []);

  useEffect(() => {
    if (!userPseudo) return;
    socket.on("ban", (banned) => {
      if (banned === userPseudo)
        handleLogout();
    });
  }, [userPseudo])

  const handleLogout = async () => {
    const response = await fetch("/api/profile", {
        method: "PUT",
      })
      const user: unknown = await response.json();
      if (!response.ok) {
        const errorMessage =
        typeof user === "object" && user !== null && "error" in user
          ? String((user as { error: string }).error ?? "Impossible de charger l'utilisateur")
          : "Impossible de charger l'utilisateur";
        throw new Error(errorMessage);
      }
    socket.emit("isdisconnecting");
    socket.disconnect();
    await authClient.signOut();
    router.push("/");
  };

  //fetch users and their inboxes
  useEffect(() => {
    async function fetchUsers() {
      if (!userPseudo) return;
        const [ures, ires] = await Promise.all([
        fetch("/api/social/users", {
          method: "GET",
        }),
        fetch(`/api/social/inbox?username=${userPseudo}`, {
          method: "GET",
        }),
      ]);
      if (!ures.ok || !ires.ok)
          return ;
      const udata = await ures.json();
      const idata = await ires.json();
      const users: type.User[] = udata.users;
      const inboxes: type.Inbox[] = idata.inboxes;
      const cU = users.find(user => user.name === userPseudo);
      if (!cU) return ;
      setCurrentUser(cU);
      setUsers(users);
      setInboxes(inboxes);
    }
    fetchUsers();

    //connect the socket
    if (socket.connected) return;
    socket.connect();
		socket.emit("login", userPseudo);

		socket.on("online_users", (users) => {
			console.log("Users from Redis:", users);
		});

		return () => {
			socket.off("online_users");
		};
  }, [userPseudo]);

  //render messages sent by other users
  useEffect(() => {
    if (!userPseudo) return;
    const handler = async ({ sender,
      receiver,
      msg,
      } : {
      sender: string,
      receiver: string,
      msg: string,
      }) => {

      if (selectedUser && selectedUser === sender)
      {
        const newMessages = await contact.getMsg(userPseudo, selectedUser);
        if (!newMessages) return;
        setCurrentMessages(newMessages);
        contact.resetUnread(userPseudo, selectedUser);
        socket.emit("has_read", {
          user: userPseudo,
          oUser: selectedUser,
        });
      }
      else //set variables to send a notification
      {
        emitGlobalNotification(msg, sender);
        fetchUnread();
      }
    }
    socket.on("received", handler);
    return () => {
      socket.off("received", handler);
    }
  }, [selectedUser, userPseudo]);

  useEffect(() => {
    if (!userPseudo) return;
    socket.on("add_conv", async () => {
      const i = await contact.getInboxes(userPseudo);
      setInboxes(i);
    });
  }, [userPseudo]);

  //render messages sent by other users
  useEffect(() => {
    if (!userPseudo || !selectedUser) return;
    //show if the selected user is writing
    socket.on("isTyping", async ({sender, receiver}) => {
      if (sender == selectedUser)
      {
        setTyper(sender);
        setTyping(true);
        clearTimeout(timeout);
        timeout = setTimeout(() => {
          setTyping(false);
        }, 2000);
      }
    });

    //show if the selected user is writing
    socket.on("isNotTyping", async ({sender, receiver}) => {
      if (sender == selectedUser)
        setTyping(false);
    });

    //adds the request dynamically
    socket.on("request", async ({user, oUser}) => {
      if (user == selectedUser) {
        setRequest(true);
        setFriendRequestSender(user);
      }
    });

    //adds match button dynamically
    socket.on("adding", async ({user, oUser}) => {
      if (user == selectedUser)
      {
        setRequest(false)
      }
    });

    //sets blocked status dynamically
    socket.on("blocked", async ({user, oUser}) => {
      if (user == selectedUser)
        setIsBlocked(true);
    });

    socket.on("blocking", async () => {
      setHasBlocked(true);
    });

    //resets status dynamically
    socket.on("unblocking", async ({user, oUser}) => {
      if (oUser == selectedUser)
        setIsBlocked(false);
      if (user == userPseudo)
        setHasBlocked(false);
    });;

    //prompt the challenge request OR show waiting modal if we sent it
    socket.on("challenge", async({sender, receiver}) => {
      if (receiver == userPseudo)
      {
        setChallenge(true);
        setOpponent(sender);
        saveChallengeToStorage(sender);
      }
      if (sender == userPseudo)
      {
        setWaitingForDuelResponse(true);
        setDuelChallengeTo(receiver);
      }
    });

    //duel refused - close waiting modal
    socket.on("refuse", async ({user, oUser}) => {
      if (oUser == userPseudo)
      {
        setWaitingForDuelResponse(false);
        setDuelChallengeTo(null);
        setOpponent(null);
        router.push("social");
      }
    });

    // send to the game if duel is accepted
    socket.on("accept", async ({user, oUser}) => {
      if (oUser == userPseudo)
      {
        setWaitingForDuelResponse(false);
        setDuelChallengeTo(null);
        router.push("game");
      }
    });

    socket.on("cancel", async ({user, oUser}) => {
      if (oUser === userPseudo || user === selectedUser)
      {
        setWaitingForDuelResponse(false);
        setDuelChallengeTo(null);
        setChallenge(false);
        setOpponent(null);
        saveChallengeToStorage(null);
      }
    });

    //sets unread to read if message is read
    socket.on("read", async ({user, oUser}) => {
      if (oUser == userPseudo) {
        setUnread(false);
      }
    });
    //reloads inboxes and exits the conversation
    socket.on("deletion", async (sender) => {
      const i = await contact.getInboxes(userPseudo);
      setInboxes(i);
      setSelectedUser("");
    });

  }, [userPseudo, selectedUser]);

  useEffect(() => {
    async function fetchmessages()
		{
			if (!currentUser || !selectedUser) return;
      const params = new URLSearchParams({
        user: currentUser.name,
        otherUser: selectedUser,
      });
      const [mres, ures] = await Promise.all([
        fetch(`/api/social/msg?${params.toString()}`, {
          method: "GET",
        }),
        fetch(`api/social/unread`, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({sender: currentUser.name, receiver: selectedUser})
        }),
      ])
      
      if (!mres.ok)
        return;
      const data = await mres.json();
      const newMessages: type.Messages[] = data.msgs;
			if (!newMessages) return;
    	setCurrentMessages(newMessages);
      
      // Reset pagination states for new conversation
      setMessageOffset(0);
      setHasMoreMessages(newMessages.length >= 20);
      
      if (!ures.ok)
        return;
      fetchUnread();

      // Load read status from localStorage
      const storedStatus = getStoredReadStatus(currentUser.name, selectedUser);
      const newStatus: Record<string, boolean> = {};
      newMessages.forEach((msg) => {
        if (msg.user_id === currentUser.id) {
          // Use stored status if available, otherwise default to false (unread)
          newStatus[msg.id] = storedStatus[msg.id] ?? false;
        }
      });
      saveReadStatusToStorage(newStatus);
		}
		fetchmessages();
      socket.emit("has_read", {
        user: userPseudo,
        oUser: selectedUser,
      });

    async function checkBlockingStatus()
    {
      if (!currentUser || !selectedUser) return;
      
      // Refetch current user to get updated blocked users list
      let updatedCurrentUser = currentUser;
      try {
        const userRes = await fetch(`api/social/user?username=${currentUser.name}`, {
          method: "GET",
        });
        if (userRes.ok) {
          const userData = await userRes.json();
          updatedCurrentUser = userData.user;
        }
      } catch {
        // Use cached currentUser if fetch fails
      }
      
      // Check if I blocked them
      let iAmBlockingThem = false;
      const res1 = await fetch(`api/social/user?username=${selectedUser}`, {
        method: "GET",
      });
      if (res1.ok) {
        const data1 = await res1.json();
        const blockedUser: type.User = data1.user;
        if (blockedUser) {
          for (const id of updatedCurrentUser.blockedUsers) {
            if (id == blockedUser.id) {
              iAmBlockingThem = true;
              break;
            }
          }
        }
      }
      
      // Check if they blocked me
      let theyBlockedMe = false;
      const res2 = await fetch(`api/social/user?username=${selectedUser}`, {
        method: "GET",
      });
      if (res2.ok) {
        const data2 = await res2.json();
        const blockingUser: type.User = data2.user;
        if (blockingUser) {
          for (const id of blockingUser.blockedUsers) {
            if (id == updatedCurrentUser.id) {
              theyBlockedMe = true;
              break;
            }
          }
        }
      }
      
      // Update both states at once
      setHasBlocked(iAmBlockingThem);
      setIsBlocked(theyBlockedMe);
    }
    checkBlockingStatus();

    async function isRequesting()
    {
      if (!currentUser || !selectedUser) return;
      const params = new URLSearchParams({
        currentUser: currentUser.name,
        otherUser: selectedUser,
      });
      const res = await fetch(`/api/social/friend?${params.toString()}`, {
        method: "GET",
      });
      if (!res.ok)
        return ;
      const data = await res.json();
      const friend: type.Friend = data.friend;
      if (!friend) {
        setRequest(false);
        setFriendRequestSender(null);
        return;
      }
      // friend.request_sent = true means OTHER USER sent us a request
      if (friend.request_sent == true)
      {
        setRequest(true);
        setFriendRequestSender(selectedUser);
      } else {
        setRequest(false);
        setFriendRequestSender(null);
      }
      return;
    }
    isRequesting();
  }, [currentUser, selectedUser])

	useEffect(() => {
		return () => {
			draftAttachments.forEach((attachment) => URL.revokeObjectURL(attachment.previewUrl));
		};
	}, [draftAttachments]);

	//notifications timer
	useEffect(() => {
		if (!inviteNotification) return;

		const timeoutId = setTimeout(() => {
			setInviteNotification(null);
		}, 3000);

		return () => clearTimeout(timeoutId);
	}, [inviteNotification]);

  //fetch the number of unreaded messages
  useEffect(() => {
    fetchUnread();
  }, [userPseudo])

  //sets read/unread status
  useEffect(() => {
    if (!currentUser || !selectedUser) return;
    async function fetchSelectedUnread()
    {
      if (!currentUser || !selectedUser) return;
        const ures = await fetch(`api/social/unread`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({sender: currentUser.name, receiver: selectedUser})
      });
      if (!ures.ok)
        return;
      const data = await ures.json();
      const unr: number = data.unread;
      setUnread(unr > 0);
    }
    fetchSelectedUnread();
  }, [selectedUser])

  useEffect(() => {
    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
    };
  }, []);

  async function fetchUnread()
  {
    if (!userPseudo) return;
    const mres = await fetch(`/api/social/unreadMap?user=${userPseudo}`, {
      method: "GET",
    })
    if (!mres.ok)
      return;
    const udata = await mres.json();
    const results: Record<string, number> = udata.results;
    setUnreadMap(results);
  }

  const openProfileViewerForUserName = useCallback(async (name: string) => {
    const res = await fetch(`api/social/user?username=${name}`, {
      method: "GET",
    });
    if (!res.ok)
      return;
    const data = await res.json();
    const targetUser: type.User = data.user;
    setProfileViewerUser(targetUser);
    setShowProfileViewer(true);
  }, []);

  const handleProfileClick = useCallback((userName: string) => {
    if (!currentUser) return;
    if (userName === currentUser.name) {
      router.push(`/profile/${userName}`);
      return;
    }

    openProfileViewerForUserName(userName);
  }, [currentUser?.name, openProfileViewerForUserName, router]);

	//Loading screen while currentUser is not set
	if (!currentUser)
		return <div>loading</div>;

  //open a add contact modal
  const openAddContactModal = () => {
    if (isInviting) return;
    setInviteUsername("");
    setIsAddContactModalOpen(true);
  };

  //close the add contact modal
  const closeAddContactModal = () => {
    if (isInviting) return;
    setIsAddContactModalOpen(false);
    setInviteUsername("");
  };

  //create a new contact
  const submitContactInvite = async () => {
    const username = inviteUsername.trim();
    if (isInviting || !username) return;

    try {
      setIsInviting(true);

      //makes an appropriate response and configure variables
      const response = await fetch("/api/social/invite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username }),
      });
      const payload = (await response.json()) as {
        error: string;
        user: { name: string; avatarUrl: string | null };
      };

      //return if there was an error in the response
      if (!response.ok) {
        return;
      }

      //check if the inbox already exist
      const params = new URLSearchParams({
        currentUser: currentUser.name,
        addUser: inviteUsername,
      });

      const ares = await fetch(`/api/social/contact?${params.toString()}`, {
        method: "GET",
      })
      if (!ares.ok)
      {
        return;
      }

      //makes a new inbox for both users and updates it
      
      const cres = await fetch("/api/social/contact", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({currentUser: currentUser.name, addUser: inviteUsername}),
      });
      const ires = await fetch(`/api/social/inbox?username=${currentUser.name}`, {
        method: "GET",
      });
      
      if (!cres.ok)
        throw Error("No new contact");
      if (!ires.ok)
        throw Error("No new inbox");
      const idata = await ires.json();
      setInboxes(idata.inboxes);
      socket.emit("new_conv", {
        sender: currentUser.name,
        receiver: inviteUsername,
      });

      const foundName = payload.user.name;
      setSelectedUser(foundName);
      setInviteNotification({
        type: "success",
        message: "Invitation sent",
      });
      setIsAddContactModalOpen(false);
      setInviteUsername("");
    } catch {
      // Errors are handled by global fetch interception
    } finally {
      setIsInviting(false);
    }
  };

  //accept someone as a friend to be able to duel
  async function addFriend()
  {
    if (!currentUser || !friendRequestSender) return;
    const res = await fetch("/api/social/friend", {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({currentUser: currentUser.name, otherUser: selectedUser}),
    })
    if (!res.ok)
      return;
    socket.emit("friend_added", {
      user: currentUser.name,
      oUser: friendRequestSender
    });
    setFriendRequestSender(null);
  }

  //refuse a friend request
  async function refuseFriendship()
  {
    if (!currentUser || !friendRequestSender) return;
    const params = new URLSearchParams({
      currentUser: currentUser.name,
      otherUser: selectedUser,
    });
    const res = await fetch(`api/social/friend?${params.toString()}`, {
      method: "DELETE",
    })
    if (!res.ok)
      return;
    socket.emit("friend_denied", {
      user: currentUser.name,
      oUser: friendRequestSender
    });
    setRequest(false);
    setFriendRequestSender(null);
  }

  const handlePickAttachments = () => {
    if (fileInputRef.current)
      fileInputRef.current.click();
  };

  const handleFilesChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    event.preventDefault();
    const files = Array.from(event.target.files ?? []);
    if (files.length === 0) return;

    const formData = new FormData();
    files.forEach((file) => {
      formData.append("file", file);
    });

    const response = await fetch("/api/upload", {
      method: "POST",
      body: formData,
    });

    if (!response.ok)
      throw Error("Images could not be uploaded")
    const data = await response.json();
    const fileName = data.name;

    for (const file of files)
    {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("url", fileName);

      const res = await fetch("/api/social/attachment", {
        method: "POST",
        body: formData,
      });
      if (!res.ok)
        continue;
      const data = await res.json();
      const id: string = data.id;
      const url: string = data.url;
      const buildAttachmentFromFile = (file: File): type.Attachment => ({
        id: id,
        name: `${Date.now()}-${file.name}`,
        sizeLabel: toSizeLabel(file.size),
        type: file.type,
        previewUrl: url,
      });
      const nextAttachments = files.map(buildAttachmentFromFile);
      setDraftAttachments((prevAttachments) => [...prevAttachments, ...nextAttachments]);
    }

    event.target.value = "";
  };

  const removeDraftAttachment = async (attachmentId: string, attachmentURL: string) => {

    const res = await fetch(`/api/social/attachment?attachmentId=${attachmentId}&url=${attachmentURL}`, {
        method: "DELETE",
      })
      if (!res.ok)
        return ;
    setDraftAttachments((prevAttachments) => {
      const target = prevAttachments.find((item) => item.id === attachmentId);
      if (target) {
        URL.revokeObjectURL(target.previewUrl);
      }
      return prevAttachments.filter((item) => item.id !== attachmentId);
    });
  };

  // Load older messages
  const handleLoadOlderMessages = async () => {
    if (!currentUser || !selectedUser || isLoadingOlderMessages || !hasMoreMessages) return;
    
    setIsLoadingOlderMessages(true);
    try {
      const params = new URLSearchParams({
        user: currentUser.name,
        otherUser: selectedUser,
        skip: (messageOffset + 20).toString(),
        take: "20",
      });
      
      const res = await fetch(`/api/social/msg?${params.toString()}`, {
        method: "GET",
      });
      
      if (!res.ok) {
        setIsLoadingOlderMessages(false);
        return;
      }
      
      const data = await res.json();
      const olderMessages: type.Messages[] = data.msgs;
      
      if (!olderMessages || olderMessages.length === 0) {
        setHasMoreMessages(false);
        setIsLoadingOlderMessages(false);
        return;
      }
      
      // Prepend older messages
      setCurrentMessages((prev) => [...olderMessages, ...prev]);
      setMessageOffset((prev) => prev + olderMessages.length);
      
      // If we got fewer than 20 messages, there are no more older messages
      if (olderMessages.length < 20) {
        setHasMoreMessages(false);
      }
    } catch (error) {
      console.error("Error loading older messages:", error);
    } finally {
      setIsLoadingOlderMessages(false);
    }
  };

  //sends a message to selected user
  const sendMessage = async () => {
    const cleanMessage = message.trim();
    if (!cleanMessage && draftAttachments.length === 0) return;
    if (isBlocked || hasBlocked) return;
    const draftIds = draftAttachments.map(draft => draft.id);

    const params = new URLSearchParams({
      user: currentUser.name,
      otherUser: selectedUser,
    });
    const response = await fetch("/api/social/msg", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({sender: currentUser.name,
          msg: cleanMessage, receiver: selectedUser,
          draftIds: draftIds}),
      });
      


    const data = await response.json();
    if (!response.ok)
      return ;

    const [res, ures] = await Promise.all([
      fetch(`/api/social/msg?${params.toString()}`, {
        method: "GET",
      }),
      fetch(`api/social/unread`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({sender: currentUser.name, receiver: selectedUser})
      }),
    ]);
    if (!res.ok)
      return;
    const msg = await res.json();
    const newMessages: type.Messages[] = msg.msgs;
    if (!newMessages) return;
    
    setCurrentMessages(newMessages);
    
    // Reset pagination states so "Load older messages" button reappears
    setMessageOffset(0);
    setHasMoreMessages(newMessages.length >= 20);

    socket.emit("notTyping", {
      sender : currentUser.name,
      receiver: selectedUser,
    });

    //reset unread messages
    if (!ures.ok)
      return;
    setUnread(true);

    //sends a signal to the other user's socket
    socket.emit("msg_sent", {
      sender: currentUser.name,
      receiver: selectedUser,
      msg: cleanMessage,
    });

    setMessage("");
    setDraftAttachments([]);
  };

  const handleInputKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (!isBlocked && !hasBlocked && event.key === "Enter") {
      event.preventDefault();
      sendMessage();
    }
  };

  const acceptDuel = async () => {
    setChallenge(false);
    saveChallengeToStorage(null);
    socket.emit("duel_accepted", {
      user: currentUser.name,
      oUser: selectedUser,
    })
    const res = await fetch("/api/social/otherFriend", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({currentUser: currentUser.name, opponent: selectedUser}),
    });
    if (!res.ok)
      return ;
    return router.push("game");
  }

  const refuseDuel = async () => {
    setChallenge(false);
    saveChallengeToStorage(null);
    socket.emit("duel_refused", {
      user: currentUser.name,
      oUser: selectedUser,
    })
  }

  const isTyping = async () => {
    if (!selectedUser || !currentUser)
      return ;

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    socket.emit("typing", {
      sender : currentUser.name,
      receiver: selectedUser,
    });

    typingTimeoutRef.current = setTimeout(() => {
      socket.emit("notTyping", {
        sender: currentUser.name,
        receiver: selectedUser,
      });
    }, 1000);
  }

  return (
    <AppPageShell showSidebar containerClassName="min-h-0 flex-1 flex-col" mainClassName="bg-gradient-to-br from-[#0c0a0f] via-[#12101a] to-[#0a0810]">
      <style>{`
        .checkered-bg {
          background-image: url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23c9a227' fill-opacity='0.03'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E");
          background-repeat: repeat;
        }
        input:focus {
          outline: none !important;
          box-shadow: none !important;
          border-color: transparent !important;
        }
        div:has(input:focus) {
          box-shadow: none !important;
          outline: none !important;
        }
      `}</style>
      {inviteNotification && (
        <div className="pointer-events-none absolute left-1/2 top-4 z-50 -translate-x-1/2">
          <div
            className={`rounded-xl border px-4 py-2 text-sm font-semibold shadow-lg ${
              inviteNotification.type === "success"
                ? "border-emerald-400/50 bg-emerald-500/90 text-white"
                : "border-red-400/50 bg-red-500/90 text-white"
            }`}
          >
            {inviteNotification.message}
          </div>
        </div>
      )}
      {opponent}
      {isAddContactModalOpen && (
        <div className="absolute inset-0 z-40 flex items-center justify-center bg-black/60 px-4">
          <div className="w-full max-w-md rounded-2xl border border-[#c9a227]/25 bg-[#1b1826] p-5 font-['Arial',_Helvetica,_sans-serif] shadow-2xl">
            <h3 className="text-base font-bold text-white">Enter a username to send DM invitation</h3>

            <input
              type="text"
              value={inviteUsername}
              onChange={(event) => setInviteUsername(event.target.value)}
              placeholder="Player username"
              onKeyDown={(e) => {
                if (e.key === "Enter" && !isInviting && inviteUsername.trim().length > 0) {
                  e.preventDefault();
                  void submitContactInvite();
                }
              }}
              className="mt-4 w-full rounded-xl border border-[#c9a227]/30 bg-[#242033] px-3 py-2 text-sm text-white outline-none placeholder:text-gray-500 focus:border-[var(--accent-color)]"
              autoFocus
            />

            <div className="mt-4 flex items-center justify-end gap-2">
              <button
                onClick={closeAddContactModal}
                disabled={isInviting}
                className="rounded-xl border border-[#c9a227]/30 bg-[#242033] px-4 py-2 text-sm font-semibold text-gray-200 transition-colors hover:bg-[#302a45] disabled:cursor-not-allowed disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={submitContactInvite}
                disabled={isInviting || inviteUsername.trim().length === 0}
                className="rounded-xl border border-[color:var(--accent-border)] bg-[var(--accent-color)] px-4 py-2 text-sm font-bold text-white transition-colors hover:bg-[var(--accent-hover)] disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isInviting ? "Recherche..." : "Send"}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="flex w-full justify-center px-4">
        <section className="checkered-bg flex h-[calc(100vh-2rem)] w-full flex-col overflow-hidden rounded-3xl border border-[#c9a227]/25 bg-black/15 font-['Arial',_Helvetica,_sans-serif] shadow-2xl">

          <ConversationList
            users={users}
            selectedUser={selectedUser}
            unreadMap={unreadMap}
            inboxes={inboxes}
            customUserAvatar={customUserAvatar}
            currentUserName={currentUser.name ?? ""}
            onSelectUser={(userName) => {
              setSelectedUser(userName);
            }}
            onAddContactClick={openAddContactModal}
          />

          <section className="flex h-full min-h-0 flex-col">

            {selectedUser && request && friendRequestSender && (
              <FriendRequestBanner
                senderName={friendRequestSender}
                onAccept={addFriend}
                onRefuse={refuseFriendship}
              />
            )}

            {selectedUser && challenge && opponent && (
              <DuelRequestBanner
                opponentName={opponent}
                onAccept={(acceptDuel)}
                onRefuse={refuseDuel}
              />
            )}

            <MessageThread
              selectedUser={selectedUser}
              currentUser={currentUser}
              messages={currentMessages}
              unread={unread}
              expandedMessages={expandedMessages}
              users={users}
              customUserAvatar={customUserAvatar}
              maxDisplayLength={MAX_DISPLAY_LENGTH}
              isTyping={typing}
              typer={typer}
              onMessageExpand={toggleMessageExpanded}
              onProfileClick={handleProfileClick}
              onLoadOlderMessages={handleLoadOlderMessages}
              isLoadingOlderMessages={isLoadingOlderMessages}
              hasMoreMessages={hasMoreMessages}
            />

            <footer className="sticky bottom-0 border-t border-[#c9a227]/30 bg-[#15131d] p-4">
              {selectedUser && (<div className="flex flex-col gap-2">
                <div className="flex items-center gap-2 rounded-full border border-[#c9a227]/30 bg-[#242033] px-2 py-2 focus-within:border-[#c9a227]/30 focus-within:ring-0">
                  <input
                    ref={fileInputRef}
                    type="file"
                    className="hidden"
                    multiple
                    onChange={handleFilesChange}
                    accept="image/*,.pdf,.txt,.doc,.docx,.png"
                  />
                {/*Bouton pour attachments*/}
                <button
                    onClick={handlePickAttachments}
                    className="flex h-9 w-9 items-center justify-center rounded-full bg-[#302a45] text-white transition-colors hover:bg-[#3b3457]"
                    aria-label="Ajouter des pièces jointes"
                  >
                    <i className="fa-solid fa-paperclip" />
                  </button>

                  <input
                    type="text"
                    placeholder={hasBlocked ? "You have blocked this user" : isBlocked ? "You are blocked by this user" : `Send a message to @${selectedUser}`}
                    value={message}
                    onChange={(event) => {
                      const newValue = event.target.value.slice(0, MAX_MESSAGE_LENGTH);
                      setMessage(newValue)
                      isTyping();
                    }}
                    onKeyDown={handleInputKeyDown}
                    maxLength={MAX_MESSAGE_LENGTH}
                    className={`flex-1 bg-transparent px-1 text-base outline-none focus:ring-0 focus:outline-none ${
                        isBlocked || hasBlocked
                          ? "text-gray-500 placeholder:text-gray-600 cursor-not-allowed"
                          : "text-gray-200 placeholder:text-gray-500"
                      }`}
                  />
                  <span className="text-xs text-gray-500">{message.length}/{MAX_MESSAGE_LENGTH}</span>
                  <button
                    onClick={() => {
                      if (!isBlocked && !hasBlocked) {
                        sendMessage();
                      }
                    }}
                    disabled={!hasDraft || isBlocked || hasBlocked}
                    className="flex h-9 w-9 items-center justify-center rounded-full border border-[color:var(--accent-border)] bg-[var(--accent-color)] text-white transition-colors hover:bg-[var(--accent-hover)] disabled:cursor-not-allowed disabled:opacity-40"
                    aria-label="Send message"
                  >
                    <i className="fa-solid fa-paper-plane" />
                  </button>
                </div>
                {draftAttachments.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {draftAttachments.map((attachment, index) => (
                      <div
                        key={`${attachment.id}-${index}`}
                        className="inline-flex items-center gap-2 rounded-full border border-[#c9a227]/30 bg-[#242033] px-3 py-1 text-xs text-gray-200"
                      >
                        <i className="fa-regular fa-paperclip" />
                        <span className="max-w-[14rem] truncate">{attachment.name}</span>
                        <span className="opacity-75">({attachment.sizeLabel})</span>
                        <button
                          onClick={() => removeDraftAttachment(attachment.id, attachment.previewUrl)}
                          className="text-gray-300 transition-colors hover:text-white"
                          aria-label={`Delete ${attachment.name}`}
                        >
                          <i className="fa-solid fa-xmark" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>)}
            </footer>
          </section>
        </section>
      </div>

      {waitingForDuelResponse && duelChallengeTo && (
      <DuelWaitingModal
        opponentName={duelChallengeTo}
        onCancel={() => {
          setWaitingForDuelResponse(false);
          setDuelChallengeTo(null);
          socket.emit("duel_cancelled", {
            user: userPseudo,
            oUser: duelChallengeTo,
          });
        }}
      />
    )}

      <ProfileViewerModal
        open={showProfileViewer}
        onClose={() => setShowProfileViewer(false)}
        user={profileViewerUser}
        currentUser={currentUser}
      />
    </AppPageShell>
  );
}
