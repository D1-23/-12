import { Outlet } from "react-router-dom";

const Layout = () => {
  return (
    <div className="h-screen w-full max-w-[360px] mx-auto bg-background flex flex-col overflow-hidden">
      <Outlet />
    </div>
  );
};

export default Layout;
