import Link from 'next/link';

interface PricingTier {
  vehicle: string;
  interior: number;
  exterior: number;
  full: number;
}

interface PricingCardProps {
  title: string;
  description: string;
  tiers: PricingTier[];
  discount: string;
  featured?: boolean;
}

export default function PricingCard({ title, description, tiers, discount, featured = false }: PricingCardProps) {
  return (
    <div className={`rounded-2xl overflow-hidden ${featured ? 'ring-4 ring-emerald-500' : 'border border-gray-200'}`}>
      <div className={`p-6 ${featured ? 'bg-emerald-500 text-white' : 'bg-gray-100 text-gray-900'}`}>
        {featured && (
          <span className="inline-block bg-white text-emerald-600 text-sm font-semibold px-3 py-1 rounded-full mb-3">
            Most Popular
          </span>
        )}
        <h3 className="text-2xl font-bold">{title}</h3>
        <p className={`mt-2 ${featured ? 'text-emerald-100' : 'text-gray-600'}`}>{description}</p>
      </div>
      <div className="bg-white p-6">
        <table className="w-full">
          <thead>
            <tr className="text-left text-gray-500 text-sm">
              <th className="pb-3 font-medium">Vehicle</th>
              <th className="pb-3 font-medium text-center">Interior</th>
              <th className="pb-3 font-medium text-center">Exterior</th>
              <th className="pb-3 font-medium text-center">
                Full
                <span className="block text-emerald-500 text-xs">({discount} off)</span>
              </th>
            </tr>
          </thead>
          <tbody className="text-gray-900">
            {tiers.map((tier, index) => (
              <tr key={index} className="border-t border-gray-100">
                <td className="py-4 font-medium">{tier.vehicle}</td>
                <td className="py-4 text-center">${tier.interior}</td>
                <td className="py-4 text-center">${tier.exterior}</td>
                <td className="py-4 text-center font-semibold text-emerald-600">${tier.full}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <Link
          href="/book"
          className={`mt-6 block w-full text-center py-3 rounded-lg font-semibold transition-colors duration-200 ${
            featured
              ? 'bg-emerald-500 text-white hover:bg-emerald-600'
              : 'bg-gray-900 text-white hover:bg-gray-800'
          }`}
        >
          Book {title}
        </Link>
      </div>
    </div>
  );
}
