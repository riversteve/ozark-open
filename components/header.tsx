import Link from "next/link"
import { Button, buttonVariants } from "@/components/ui/button"
import { createClient } from "@/lib/supabase/server"

export async function Header() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  let displayName: string | null = null
  if (user) {
    const { data } = await supabase
      .from("users")
      .select("display_name")
      .eq("id", user.id)
      .single()
    displayName = (data as { display_name: string } | null)?.display_name ?? user.email ?? null
  }

  return (
    <header className="border-b">
      <div className="container mx-auto flex h-14 items-center justify-between px-4">
        <Link href="/" className="text-lg font-bold">
          Ozark Open
        </Link>
        {user ? (
          <div className="flex items-center gap-4">
            <span className="text-sm text-muted-foreground">{displayName}</span>
            <form method="POST" action="/auth/signout">
              <Button type="submit" variant="outline" size="sm">
                Log out
              </Button>
            </form>
          </div>
        ) : (
          <Link
            href="/login"
            className={buttonVariants({ variant: "outline", size: "sm" })}
          >
            Log in
          </Link>
        )}
      </div>
    </header>
  )
}
