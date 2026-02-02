/**
 * Email Templates for Sales CRM
 */

export interface EmailTemplate {
  id: string;
  name: string;
  subject: string;
  body: string;
  category: 'intro' | 'follow_up' | 'meeting' | 'proposal' | 'thank_you' | 'custom';
  leadTypes?: string[]; // Which lead types this template is for
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export const DEFAULT_TEMPLATES: Omit<EmailTemplate, 'id' | 'createdAt' | 'updatedAt'>[] = [
  {
    name: 'Initial Introduction',
    subject: 'Emerald Detailing - Professional Auto Detailing Services',
    body: `Hi {{contactName}},

I hope this email finds you well! My name is {{senderName}} from Emerald Detailing.

I'm reaching out because we specialize in professional auto detailing services and I thought our services might be a great fit for {{companyName}}.

We offer:
• Full interior and exterior detailing
• Paint correction and ceramic coating
• Fleet and volume pricing available
• Flexible scheduling

Would you be open to a quick 15-minute call to discuss how we might be able to help? I'd love to learn more about your needs.

Best regards,
{{senderName}}
Emerald Detailing
{{senderPhone}}`,
    category: 'intro',
    isActive: true,
  },
  {
    name: 'Turo Host Introduction',
    subject: 'Keep Your Turo Fleet Spotless - Emerald Detailing',
    body: `Hi {{contactName}},

As a fellow car enthusiast, I know how important it is to keep your Turo vehicles in pristine condition for those 5-star reviews!

I'm {{senderName}} from Emerald Detailing, and we work with several Turo hosts in the area to help them:

✓ Quick turnaround between rentals
✓ Maintain that "new car" feel guests love
✓ Volume pricing for multiple vehicles
✓ Flexible scheduling around your bookings

We understand the Turo business and know that presentation directly impacts your ratings and rental rates.

Would you be interested in a quick chat about how we could help {{companyName}}?

Best,
{{senderName}}
Emerald Detailing`,
    category: 'intro',
    leadTypes: ['turo_host'],
    isActive: true,
  },
  {
    name: 'Dealership Introduction',
    subject: 'Professional Detailing Services for {{companyName}}',
    body: `Dear {{contactName}},

I'm reaching out from Emerald Detailing regarding professional detailing services for {{companyName}}.

We currently partner with several dealerships in the area and provide:

• New vehicle delivery prep
• Used car reconditioning
• Customer detail services
• Showroom-ready finish every time

Our team is experienced with high-volume operations and understands the importance of quick turnaround times without sacrificing quality.

I'd welcome the opportunity to discuss how we might support your dealership's detailing needs. Would you have 15 minutes this week for a brief call?

Best regards,
{{senderName}}
Emerald Detailing
{{senderPhone}}`,
    category: 'intro',
    leadTypes: ['dealership'],
    isActive: true,
  },
  {
    name: 'Follow Up - No Response',
    subject: 'Following up - Emerald Detailing',
    body: `Hi {{contactName}},

I wanted to follow up on my previous email about our detailing services.

I understand you're busy, so I'll keep this brief - we'd love the opportunity to show you the quality of our work.

Would you be available for a quick 10-minute call this week? Or if you prefer, I'd be happy to send over some information about our services and pricing.

Looking forward to hearing from you!

Best,
{{senderName}}
Emerald Detailing`,
    category: 'follow_up',
    isActive: true,
  },
  {
    name: 'Follow Up - After Call',
    subject: 'Great speaking with you - Next steps',
    body: `Hi {{contactName}},

It was great speaking with you today! Thank you for taking the time to chat about {{companyName}}'s detailing needs.

As discussed, here's a quick recap:
[Add discussion points here]

Next steps:
[Add next steps here]

Please don't hesitate to reach out if you have any questions. I look forward to the opportunity to work together!

Best regards,
{{senderName}}
Emerald Detailing
{{senderPhone}}`,
    category: 'follow_up',
    isActive: true,
  },
  {
    name: 'Meeting Confirmation',
    subject: 'Meeting Confirmed - {{meetingDate}}',
    body: `Hi {{contactName}},

This is a confirmation for our upcoming meeting:

📅 Date: {{meetingDate}}
⏰ Time: {{meetingTime}}
📍 Location: {{meetingLocation}}

I'm looking forward to discussing how Emerald Detailing can support {{companyName}}.

If you need to reschedule, please let me know as soon as possible.

See you soon!

Best,
{{senderName}}
Emerald Detailing
{{senderPhone}}`,
    category: 'meeting',
    isActive: true,
  },
  {
    name: 'Proposal Follow Up',
    subject: 'Checking in on our proposal - Emerald Detailing',
    body: `Hi {{contactName}},

I wanted to follow up on the proposal I sent over for {{companyName}}.

Have you had a chance to review it? I'd be happy to:
• Walk through any details
• Answer any questions
• Adjust the proposal based on your feedback

What would be the best way to move forward?

Best regards,
{{senderName}}
Emerald Detailing`,
    category: 'proposal',
    isActive: true,
  },
  {
    name: 'Thank You - New Client',
    subject: 'Welcome to Emerald Detailing!',
    body: `Hi {{contactName}},

Thank you so much for choosing Emerald Detailing! We're excited to work with {{companyName}}.

Here's what to expect:
• Our team will reach out to schedule your first service
• We'll send appointment reminders
• After each service, we'd love your feedback

If you ever have questions or need anything at all, please don't hesitate to reach out directly.

Thank you again for your business!

Warmly,
{{senderName}}
Emerald Detailing
{{senderPhone}}`,
    category: 'thank_you',
    isActive: true,
  },
];

/**
 * Replace template variables with actual values
 */
export function populateTemplate(template: string, variables: Record<string, string>): string {
  let result = template;
  Object.entries(variables).forEach(([key, value]) => {
    const regex = new RegExp(`{{${key}}}`, 'g');
    result = result.replace(regex, value || `[${key}]`);
  });
  return result;
}

/**
 * Generate mailto link
 */
export function generateMailtoLink(
  to: string,
  subject: string,
  body: string
): string {
  const encodedSubject = encodeURIComponent(subject);
  const encodedBody = encodeURIComponent(body);
  return `mailto:${to}?subject=${encodedSubject}&body=${encodedBody}`;
}
