"use client";

import React from 'react';

interface Props {
    stepName: string;
    children: React.ReactNode;
}

interface State {
    hasError: boolean;
    message: string;
}

export class StepErrorBoundary extends React.Component<Props, State> {
    constructor(props: Props) {
        super(props);
        this.state = { hasError: false, message: '' };
    }

    static getDerivedStateFromError(error: unknown): State {
        const message = error instanceof Error ? error.message : String(error);
        return { hasError: true, message };
    }

    componentDidCatch(error: unknown, info: React.ErrorInfo) {
        console.error(`[StepErrorBoundary] Crash in step "${this.props.stepName}":`, error, info.componentStack);
    }

    handleRetry = () => {
        this.setState({ hasError: false, message: '' });
    };

    render() {
        if (this.state.hasError) {
            return (
                <div className="flex flex-col items-center justify-center p-12 text-center gap-4">
                    <p className="text-gray-700 font-medium">
                        Se ha producido un error en este paso.
                    </p>
                    {this.state.message && (
                        <p className="text-sm text-gray-400 font-mono">{this.state.message}</p>
                    )}
                    <button
                        onClick={this.handleRetry}
                        className="mt-2 px-4 py-2 rounded bg-blue-600 text-white text-sm hover:bg-blue-700"
                    >
                        Reintentar
                    </button>
                </div>
            );
        }

        return this.props.children;
    }
}
