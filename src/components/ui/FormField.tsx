import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { AlertTriangle, CheckCircle, Info, LoaderCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { Label } from "@/components/ui/label";

const formFieldVariants = cva("space-y-2", {
  variants: {
    size: {
      default: "space-y-2",
      sm: "space-y-1",
      lg: "space-y-3",
    },
  },
  defaultVariants: {
    size: "default",
  },
});

export type ValidationState = "default" | "success" | "warning" | "error" | "loading";

export interface FormFieldProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof formFieldVariants> {
  label: string;
  error?: string;
  warning?: string;
  success?: string;
  helpText?: string;
  required?: boolean;
  disabled?: boolean;
  children: React.ReactNode;
}

const getValidationState = (props: {
  error?: string;
  warning?: string;
  success?: string;
}): ValidationState => {
  if (props.error) return "error";
  if (props.warning) return "warning";
  if (props.success) return "success";
  return "default";
};

const getValidationIcon = (state: ValidationState) => {
  switch (state) {
    case "success":
      return CheckCircle;
    case "warning":
      return AlertTriangle;
    case "error":
      return AlertTriangle;
    case "loading":
      return LoaderCircle;
    default:
      return null;
  }
};

const getValidationColor = (state: ValidationState) => {
  switch (state) {
    case "success":
      return "text-success";
    case "warning":
      return "text-warning";
    case "error":
      return "text-destructive";
    case "loading":
      return "text-muted-foreground animate-spin";
    default:
      return "text-muted-foreground";
  }
};

const getMessageText = (props: {
  error?: string;
  warning?: string;
  success?: string;
  helpText?: string;
}): string | undefined => {
  if (props.error) return props.error;
  if (props.warning) return props.warning;
  if (props.success) return props.success;
  return props.helpText;
};

export const FormField = React.forwardRef<HTMLDivElement, FormFieldProps>(
  (
    {
      className,
      size,
      label,
      error,
      warning,
      success,
      helpText,
      required,
      disabled,
      children,
      ...props
    },
    ref
  ) => {
    const fieldId = React.useId();
    const validationState = getValidationState({ error, warning, success });
    const messageText = getMessageText({ error, warning, success, helpText });
    const ValidationIcon = getValidationIcon(validationState);
    const iconColor = getValidationColor(validationState);

    // Clone children and add validation props
    const enhancedChildren = React.Children.map(children, (child) => {
      if (React.isValidElement(child)) {
        const additionalProps = {
          id: fieldId,
          "aria-invalid": validationState === "error",
          "aria-describedby": messageText ? `${fieldId}-message` : undefined,
          disabled: disabled || (child.props as { disabled?: boolean })?.disabled,
          "data-state": validationState,
        };

        return React.cloneElement(child, additionalProps);
      }
      return child;
    });

    return (
      <div
        ref={ref}
        className={cn(formFieldVariants({ size }), className)}
        {...props}
      >
        <Label
          htmlFor={fieldId}
          className={cn(
            "text-sm font-medium",
            disabled && "text-muted-foreground"
          )}
        >
          {label}
          {required && (
            <span className="text-destructive ml-1" aria-label="required">
              *
            </span>
          )}
        </Label>

        <div className="relative">
          {enhancedChildren}
        </div>

        {messageText && (
          <div
            id={`${fieldId}-message`}
            className={cn(
              "flex items-center gap-2 text-sm",
              validationState === "error" && "text-destructive",
              validationState === "warning" && "text-warning",
              validationState === "success" && "text-success",
              validationState === "default" && "text-muted-foreground"
            )}
            role={validationState === "error" ? "alert" : "status"}
            aria-live={validationState === "error" ? "assertive" : "polite"}
          >
            {ValidationIcon && (
              <ValidationIcon
                className={cn("h-4 w-4 flex-shrink-0", iconColor)}
                aria-hidden="true"
              />
            )}
            <span>{messageText}</span>
          </div>
        )}
      </div>
    );
  }
);

FormField.displayName = "FormField";
