import AdminLayoutClient from './AdminLayoutClient';

export const metadata = {
  title: 'Admin Console | Silverbyte Studio',
  description: 'Manage the studio portfolio and Silver Red Store',
};

export default function AdminLayout({ children }) {
  return <AdminLayoutClient>{children}</AdminLayoutClient>;
}
