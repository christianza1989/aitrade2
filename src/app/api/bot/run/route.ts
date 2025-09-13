import { NextResponse } from 'next/server';

export async function GET() {
    return NextResponse.json({
        message: "This endpoint is for debugging only. The autonomous bot runs in a separate worker process. To start/stop the bot, use the button in the UI."
    });
}
