import Link from "next/link";
import { Card } from "~/components/ui/Card";
import { Button } from "~/components/ui/Button";

interface GameModeCardProps {
  title: string;
  description: string;
  icon: string;
  iconColor: string;
  stats: Array<{
    label: string;
    value: string | number;
    color: string;
  }>;
  buttonText: string;
  buttonHref: string;
  buttonColor: "blue" | "green" | "purple";
}

export function GameModeCard({
  title,
  description,
  icon,
  iconColor,
  stats,
  buttonText,
  buttonHref,
  buttonColor,
}: GameModeCardProps) {
  const buttonVariants = {
    blue: "primary",
    green: "secondary",
    purple: "outline",
  } as const;

  return (
    <Card className="w-96 flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <span className="text-xl font-bold">{title}</span>
        <span className={`text-${iconColor} text-2xl`}>
          <i className={icon}></i>
        </span>
      </div>
      
      <p className="text-gray-600">{description}</p>
      
      <div className="bg-gray-100 rounded-lg p-4 flex flex-col gap-2">
        {stats.map((stat, index) => (
          <div key={index} className="flex justify-between text-gray-700">
            <span>{stat.label}</span>
            <span className={`font-semibold text-${stat.color}`}>
              {stat.value}
            </span>
          </div>
        ))}
      </div>
      
      <Link href={buttonHref}>
        <Button 
          variant={buttonVariants[buttonColor]} 
          size="lg" 
          className="w-full"
        >
          {buttonText}
        </Button>
      </Link>
    </Card>
  );
} 