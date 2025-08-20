// src/components/how-it-works/Section.tsx

import { ReactNode } from "react";

interface SectionProps {
    title: string;
    subtitle: string;
    children: ReactNode;
}

export function Section({ title, subtitle, children }: SectionProps) {
    return (
        <section className="py-12">
            <div className="text-center mb-10">
                <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">{title}</h2>
                <p className="mt-4 text-lg text-gray-400">{subtitle}</p>
            </div>
            <div>
                {children}
            </div>
        </section>
    );
}