"use client";

import { useEffect, useMemo, useState } from "react";
import AppPageShell from "@/components/AppPageShell";
import UsersManagementPanel from "@/components/organisms/admin/UsersManagementPanel";
import ReportedConversationsPanel from "@/components/organisms/admin/ReportedConversationsPanel";
import type { type } from "./index";
import { manage }  from "./index";
import { socket } from "../../socket"
import { authClient } from "@/lib/auth-client";
import NotificationToast from "@/components/organisms/home/NotificationToast";
import { useRouter } from "next/navigation";

export default function AdminPage() {
  const router = useRouter();
  const [users, setUsers] = useState<type.User[]>([]);
  const [reports, setReports] = useState<type.ReportedConv[]>([]);

  const loadingUsers = false;
  const usersError = null;
  const loadingReports = false;
  const reportsError = null;

  const [userQuery, setUserQuery] = useState("");
  const [selectedReportId, setSelectedReportId] = useState("");
  const [userPseudo, setUserPseudo] = useState<string | null>(null);
  const [currentRole, setCurrentRole] = useState("");
  const [notification, setNotification] = useState<string | null>(null);
  const [showNotification, setShowNotification] = useState(true);
  const [notifSender, setNotifSender] = useState<string | null>(null);

  useEffect(() => {
    const getUserData = async () => {
      const { data } = await authClient.getSession();
      if (data && data.user.name)
        setUserPseudo(data.user.name);
      else
        router.push("/not-connected");
    };

    const timeoutId = window.setTimeout(() => {
      void getUserData();
    }, 0);

    async function fetchUsersAndReports()
    {
      const [uRes, rRes] = await Promise.all([
        fetch("/api/admin/users", {
          method: "GET",
        }),
        fetch("/api/admin/reports", {
          method: "GET",
        }),
      ])
      const uData = await uRes.json();
      const u: type.User[] = uData.users;
      const rData = await rRes.json();
      const r: type.ReportedConv[] = rData.reports;
      setUsers(u);
      if (!r)
        setReports([])
      else
        setReports(r);
    }

      const fetchTimeoutId = window.setTimeout(() => {
        void fetchUsersAndReports();
      }, 0);

      return () => {
        window.clearTimeout(timeoutId);
        window.clearTimeout(fetchTimeoutId);
      };
  }, []);

  useEffect(() => {
    if (!userPseudo) return;
    socket.on("received", async ({sender, receiver, msg}) => {
      setNotification(msg);
      setNotifSender(sender);
      setShowNotification(true);
    })
  }, [userPseudo])

  useEffect(() => {
    if (!userPseudo) return;
    const cU = users.find(u => u.name === userPseudo);
      if (cU && cU.badges.includes("ADMIN"))
        setCurrentRole("ADMIN");
      if (cU && (!cU.badges.includes("ADMIN") && !cU.badges.includes("MODERATOR")))
        router.push("/home");
  }, [userPseudo, users])

  useEffect(() => {
    if (!userPseudo || socket.connected) return;

    socket.connect();
    socket.emit("login", userPseudo);
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

  useEffect(() => {
    const fetchUsers = async () => {
      const u = await manage.getUsers();
      setUsers(u);
    };

    const fetchReports = async () => {
      const r = await manage.getReports();
      if (!r)
        return ;
      else
        setReports(r);
    };

    socket.on("newUser", fetchUsers);
    socket.on("newReport", fetchReports);
    socket.on("lessReports", fetchReports);
    socket.on("newMod", fetchUsers);
    socket.on("noMod", fetchUsers);
    socket.on("ban", fetchUsers);
    socket.on("unban", fetchUsers);

    return () => {
      socket.off("newUser", fetchUsers);
      socket.off("newReport", fetchReports);
      socket.off("lessReports", fetchReports);
      socket.off("newMod", fetchUsers);
      socket.off("noMod", fetchUsers);
      socket.off("ban", fetchUsers);
      socket.off("unban", fetchUsers);
    }
  }, []);

  const filteredUsers = useMemo(() => {
    const normalizedQuery = userQuery.trim().toLowerCase();
    if (!normalizedQuery) return users;

    return users.filter((user) => {
      const inPseudo = user.name.toLowerCase().includes(normalizedQuery);
      const inBadges = user.badges.join(" ").toLowerCase().includes(normalizedQuery);
      return inPseudo || inBadges;
    });
  }, [userQuery, users]);

  return (
    <AppPageShell showSidebar containerClassName="min-h-0 flex-1">
      {showNotification && notification && notifSender && (<NotificationToast onClose={() => setShowNotification(false)} msg={notification} sender={notifSender} />)}
      <div className="flex min-h-0 w-full flex-col gap-3 lg:flex-row lg:gap-4">
        <UsersManagementPanel
          users={users}
          filteredUsers={filteredUsers}
          loadingUsers={loadingUsers}
          usersError={usersError}
          userQuery={userQuery}
          onUserQueryChange={setUserQuery}
          pendingReportsCount={reports.length}
          currentRole={currentRole}
        />

        <ReportedConversationsPanel
          reports={reports}
          loadingReports={loadingReports}
          reportsError={reportsError}
          selectedReportId={selectedReportId}
          onSelectReportId={setSelectedReportId}
        />
      </div>
    </AppPageShell>
  );
}
