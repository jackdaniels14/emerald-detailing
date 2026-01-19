import type { Metadata } from 'next';
import ContactForm from '@/components/ContactForm';

export const metadata: Metadata = {
  title: 'Contact Us | Emerald Detailing',
  description: 'Get in touch with Emerald Detailing. Call, email, or send us a message. We serve the Greater Seattle area with professional mobile car detailing.',
};

export default function ContactPage() {
  return <ContactForm />;
}
