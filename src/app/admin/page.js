import Link from 'next/link';
import { ArrowRight, Globe, Smartphone } from 'lucide-react';
import styles from './dashboard.module.css';

const destinations = [
  { href: '/admin/portfolio', title: 'Studio Portfolio', description: 'Edit the homepage and featured products.', icon: Globe },
  { href: '/admin/store', title: 'Silver Red Store', description: 'Manage apps, publish releases and review downloads.', icon: Smartphone },
];

export default function AdminDashboard() {
  return (
    <div className={styles.dashboard}>
      <h1 className={styles.welcomeTitle}>Studio dashboard</h1>
      <div className={styles.destinations}>
        {destinations.map(({ href, title, description, icon: Icon }) => (
          <Link key={href} href={href} className={styles.destination}>
            <Icon size={24} aria-hidden="true" />
            <h2 className={styles.cardTitle}>{title}</h2>
            <p className={styles.welcomeSubtitle}>{description}</p>
            <ArrowRight size={18} aria-hidden="true" />
          </Link>
        ))}
      </div>
    </div>
  );
}
