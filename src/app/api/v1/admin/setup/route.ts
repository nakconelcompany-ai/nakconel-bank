import { NextResponse } from 'next/server';

// The previous public GET setup route embedded a default admin password and
// could create an administrative identity with a wallet. Provision admins only
// through a controlled, authenticated operator workflow; never via public GET.
export async function GET() {
  return NextResponse.json({
    success: false,
    error: 'Public admin setup is disabled. Use the secured admin provisioning process.',
  }, { status: 410 });
}
