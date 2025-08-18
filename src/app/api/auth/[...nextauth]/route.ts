import NextAuth from "next-auth"
import CredentialsProvider from "next-auth/providers/credentials"

const handler = NextAuth({
  providers: [
    CredentialsProvider({
      name: 'Credentials',
      credentials: {
        username: { label: "Username", type: "text", placeholder: "admin" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials, req) {
        // For now, we'll use a static user. Later, this can be replaced with a database check.
        if (credentials?.username === "admin" && credentials?.password === "password") {
          return { id: "1", name: "Admin", email: "admin@example.com" }
        }
        return null
      }
    })
  ],
  secret: process.env.NEXTAUTH_SECRET,
  session: {
    strategy: "jwt",
  },
  pages: {
    signIn: '/auth/signin',
  }
})

export { handler as GET, handler as POST }
