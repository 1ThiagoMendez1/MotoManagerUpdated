interface LayoutProps {
  children: React.ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  // Since we removed tenant logic, this is now a simple layout
  return <>{children}</>;
}