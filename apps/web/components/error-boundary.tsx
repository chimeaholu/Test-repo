"use client";

import { Component } from "react";
import type { ErrorInfo, ReactNode } from "react";

import { ErrorState } from "@/components/ui-primitives";

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode | ((error: Error, reset: () => void) => ReactNode);
}

interface ErrorBoundaryState {
  error: Error | null;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error("[ErrorBoundary] Unhandled error:", error);
    console.error("[ErrorBoundary] Component stack:", info.componentStack);
  }

  reset = (): void => {
    this.setState({ error: null });
  };

  render(): ReactNode {
    const { error } = this.state;
    const { children, fallback } = this.props;

    if (error) {
      if (typeof fallback === "function") {
        return fallback(error, this.reset);
      }

      if (fallback) {
        return fallback;
      }

      return (
        <ErrorState
          title="Something went wrong"
          body="An unexpected error occurred. Please try again or reload the page."
          action={
            <button className="button-primary" onClick={this.reset} type="button">
              Try again
            </button>
          }
        />
      );
    }

    return children;
  }
}
