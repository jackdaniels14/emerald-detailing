interface ServiceCardProps {
  title: string;
  description: string;
  features: string[];
  icon: React.ReactNode;
}

export default function ServiceCard({ title, description, features, icon }: ServiceCardProps) {
  return (
    <div className="bg-white rounded-xl shadow-lg overflow-hidden hover:shadow-xl transition-shadow duration-300">
      <div className="bg-emerald-500 p-6 text-white">
        <div className="w-12 h-12 mb-4">{icon}</div>
        <h3 className="text-2xl font-bold">{title}</h3>
      </div>
      <div className="p-6">
        <p className="text-gray-600 mb-4">{description}</p>
        <ul className="space-y-2">
          {features.map((feature, index) => (
            <li key={index} className="flex items-start">
              <svg
                className="w-5 h-5 text-emerald-500 mr-2 mt-0.5 flex-shrink-0"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              <span className="text-gray-700">{feature}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
