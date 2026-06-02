import Sidebar from "./Sidebar";

type SidebarShellProps = {
  className?: string;
};

export default function SidebarShell({ className = "" }: SidebarShellProps) {
  return (
    <div className={`hidden lg:block lg:p-3 ${className}`.trim()}>
      <Sidebar />
    </div>
  );
}
