import * as React from "react";
import { Alert, AlertTitle, AlertDescription } from "./alert";
import { CheckCircle, AlertTriangle, Info, AlertCircle } from "lucide-react";

interface CustomToastProps {
  variant: "success" | "destructive" | "warning" | "info";
  title: string;
  description: string;
  icon?: React.ReactNode;
}

export function CustomToast({ variant, title, description, icon }: CustomToastProps) {
  const getIcon = () => {
    if (icon) return icon;

    switch (variant) {
      case "success":
        return <CheckCircle className="h-4 w-4" />;
      case "destructive":
        return <AlertTriangle className="h-4 w-4" />;
      case "warning":
        return <AlertTriangle className="h-4 w-4" />;
      case "info":
        return <Info className="h-4 w-4" />;
      default:
        return <AlertCircle className="h-4 w-4" />;
    }
  };

  return (
    <Alert variant={variant} className="border-2 shadow-lg">
      {getIcon()}
      <AlertTitle className="text-sm font-semibold">{title}</AlertTitle>
      <AlertDescription className="text-xs">{description}</AlertDescription>
    </Alert>
  );
}
