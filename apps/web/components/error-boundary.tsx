"use client";

import React from "react";
import { Component, type ErrorInfo, type ReactNode } from "react";

import { ErrorState } from "@/components/error-state";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  primaryActionLabel?: string;
  secondaryHref?: string;
  secondaryLabel?: string;
  title?: string;
}

interface State {
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("[ErrorBoundary]", error, info.componentStack);
  }

  render() {
    if (this.state.error) {
      if (this.props.fallback) return this.props.fallback;
      return (
        <ErrorState
          context="Section error"
          error={this.state.error}
          onPrimaryAction={() => this.setState({ error: null })}
          primaryActionLabel={this.props.primaryActionLabel}
          secondaryHref={this.props.secondaryHref}
          secondaryLabel={this.props.secondaryLabel}
          title={this.props.title}
        />
      );
    }
    return this.props.children;
  }
}
