import { AuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import dbConnect from "@/lib/db";
import User from "@/lib/models/User";

export const authOptions: AuthOptions = {
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        username: { label: "Username", type: "text" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.username || !credentials?.password) return null;

        await dbConnect();

        let user = await User.findOne({ username: credentials.username });

        // Auto-create admin user if not exists
        if (
          !user &&
          credentials.username === (process.env.ADMIN_USERNAME || "hovsep")
        ) {
          const hash = await bcrypt.hash(
            process.env.ADMIN_PASSWORD || "changeme",
            12
          );
          user = await User.create({
            username: process.env.ADMIN_USERNAME || "hovsep",
            passwordHash: hash,
            role: "admin",
          });
        }

        if (!user) return null;

        const valid = await bcrypt.compare(
          credentials.password,
          user.passwordHash
        );
        if (!valid) return null;

        return { id: user._id.toString(), name: user.username, email: user.username };
      },
    }),
  ],
  session: { strategy: "jwt" },
  pages: {
    signIn: "/login",
    error: "/login",
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) token.id = user.id;
      return token;
    },
    async session({ session, token }) {
      if (session.user) (session.user as Record<string, unknown>).id = token.id;
      return session;
    },
  },
  secret: process.env.NEXTAUTH_SECRET,
};
