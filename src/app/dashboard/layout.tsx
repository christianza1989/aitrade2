import { Sidebar } from '@/components/sidebar';
import { Header } from '@/components/header';
import { DashboardProvider } from '@/context/DashboardContext';

export default function DashboardLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <DashboardProvider>
            <div className="flex h-screen bg-gray-800">
                <div className="w-64">
                    <Sidebar />
                </div>
                <div className="flex-1 flex flex-col">
                    <Header />
                    <main className="flex-1 p-8 overflow-y-auto">
                        {children}
                    </main>
                </div>
            </div>
        </DashboardProvider>
    );
}
