import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { signToken, verifyPassword } from "@/lib/auth";

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { employeeNumber, password } = body as {
    employeeNumber: string;
    password: string;
  };

  if (!employeeNumber || !password) {
    return NextResponse.json({ error: "Missing credentials" }, { status: 400 });
  }

  const personnel = await prisma.personnel.findUnique({
    where: { employeeNumber },
  });

  if (!personnel || !personnel.isAdmin || !personnel.passwordHash) {
    return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
  }

  const valid = await verifyPassword(password, personnel.passwordHash);
  if (!valid) {
    return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
  }

  const token = await signToken({
    id: personnel.id,
    employeeNumber: personnel.employeeNumber,
    firstName: personnel.firstName,
    lastName: personnel.lastName,
  });

  const response = NextResponse.json({ success: true });
  response.cookies.set("fms_session", token, {
    httpOnly: true,
    sameSite: "strict",
    maxAge: 60 * 60 * 8,
    path: "/",
  });

  return response;
}
