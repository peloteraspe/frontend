import { NextResponse } from 'next/server';
import { getServerSupabase } from '@core/api/supabase.server';

function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const email = String(body?.email || '')
      .trim()
      .toLowerCase();

    if (!isValidEmail(email)) {
      return NextResponse.json({ message: 'Correo invalido.' }, { status: 400 });
    }

    const supabase = await getServerSupabase();
    const { error } = await supabase.from('waitlist_emails').insert({
      email,
      source: 'coming_soon',
    });

    if (error) {
      const message = (error.message || '').toLowerCase();
      if (
        message.includes('duplicate') ||
        message.includes('unique') ||
        message.includes('already exists')
      ) {
        return NextResponse.json(
          { message: 'Este correo ya estaba en la lista. Te avisaremos igual.' },
          { status: 200 }
        );
      }

      if (message.includes('waitlist_emails') && message.includes('does not exist')) {
        return NextResponse.json(
          { message: 'Falta crear la tabla waitlist_emails en Supabase.' },
          { status: 500 }
        );
      }

      return NextResponse.json({ message: 'No se pudo guardar el correo.' }, { status: 500 });
    }

    return NextResponse.json({ message: 'Correo guardado. Te avisaremos al lanzar.' }, { status: 200 });
  } catch {
    return NextResponse.json({ message: 'Solicitud invalida.' }, { status: 400 });
  }
}
