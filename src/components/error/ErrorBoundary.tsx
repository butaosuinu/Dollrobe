"use client";

import { Component } from "react";
import type { ErrorInfo, ReactNode } from "react";

type Props = {
  readonly children: ReactNode;
  readonly fallback: ReactNode;
};

type State = {
  readonly hasError: boolean;
};

class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  override componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    console.error("ErrorBoundary caught:", error, errorInfo);
  }

  override render(): ReactNode {
    if (this.state.hasError) {
      return this.props.fallback;
    }
    return this.props.children;
  }
}

export { ErrorBoundary };
