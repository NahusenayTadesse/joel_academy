import LayoutDashboard from '@lucide/svelte/icons/layout-dashboard';
import BookOpen from '@lucide/svelte/icons/book-open';
import Layers from '@lucide/svelte/icons/layers';
import UserRound from '@lucide/svelte/icons/user-round';
import Quote from '@lucide/svelte/icons/quote';
import Star from '@lucide/svelte/icons/star';
import ClipboardCheck from '@lucide/svelte/icons/clipboard-check';
import Landmark from '@lucide/svelte/icons/landmark';
import Award from '@lucide/svelte/icons/award';
import Inbox from '@lucide/svelte/icons/inbox';
import Mail from '@lucide/svelte/icons/mail';
import TicketPercent from '@lucide/svelte/icons/ticket-percent';
import ChartColumn from '@lucide/svelte/icons/chart-column';
import ChartLine from '@lucide/svelte/icons/chart-line';
import PanelsTopLeft from '@lucide/svelte/icons/panels-top-left';
import MailCheck from '@lucide/svelte/icons/mail-check';
import MessageSquareText from '@lucide/svelte/icons/message-square-text';
import type { NavItem } from '@nahu/admin-kit/navigation';
export const NAVIGATION: NavItem[] = [
 { title: 'Overview', url: '/dashboard', icon: LayoutDashboard },
 { title: 'Reports', url: '/dashboard/reports', icon: ChartColumn },
 { title: 'Analytics', url: '/dashboard/analytics', icon: ChartLine },
 { title: 'Courses', url: '/dashboard/courses', icon: BookOpen, section: 'Catalog' },
 { title: 'Categories', url: '/dashboard/categories', icon: Layers, section: 'Catalog' },
 { title: 'Instructors', url: '/dashboard/instructors', icon: UserRound, section: 'Catalog' },
 { title: 'Testimonials', url: '/dashboard/testimonials', icon: Quote, section: 'Catalog' },
 { title: 'Reviews', url: '/dashboard/reviews', icon: Star, section: 'Catalog' },
 { title: 'Landing page', url: '/dashboard/landing', icon: PanelsTopLeft, section: 'Catalog' },
 { title: 'Enrollments', url: '/dashboard/enrollments', icon: ClipboardCheck, section: 'Students' },
 { title: 'Payment methods', url: '/dashboard/payment-methods', icon: Landmark, section: 'Students' },
 { title: 'Promo codes', url: '/dashboard/promo-codes', icon: TicketPercent, section: 'Students' },
 { title: 'Certificates', url: '/dashboard/certificates', icon: Award, section: 'Students' },
 { title: 'Messages', url: '/dashboard/messages', icon: Inbox, section: 'Outreach' },
 { title: 'Subscribers', url: '/dashboard/subscribers', icon: Mail, section: 'Outreach' },
 { title: 'Email log', url: '/dashboard/emails', icon: MailCheck, section: 'Outreach' },
 { title: 'SMS log', url: '/dashboard/sms', icon: MessageSquareText, section: 'Outreach' }
];
export const ENTITIES: Record<string, string> = {};
