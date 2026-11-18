import AdminLayoutClient from './AdminLayoutClient';

export const metadata = {
  title: 'Admin Console | Silver Red Store',
  description: 'Silver Byte Studios App Management Console',
};

export default function AdminLayout({ children }) {
  return <AdminLayoutClient>{children}</AdminLayoutClient>;
}
