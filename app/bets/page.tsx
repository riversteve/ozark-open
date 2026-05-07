import { createClient } from "@/lib/supabase/server"
import { Badge } from "@/components/ui/badge"
import { toFractional, toImpliedProbability } from "@/lib/odds"

type BetCategory = { name: string }

type BetRow = {
  id: string
  bet_number: number
  description: string
  american_odds: number
  round_number: number
  status: string
  outcome: string | null
  bet_categories: BetCategory | null
}

type CategoryGroup = { name: string; bets: BetRow[] }
type RoundGroup = { round: number; categories: CategoryGroup[] }

function groupBets(bets: BetRow[]): RoundGroup[] {
  const rounds = new Map<number, Map<string, BetRow[]>>()
  for (const bet of bets) {
    const catName = bet.bet_categories?.name ?? "Uncategorized"
    if (!rounds.has(bet.round_number)) rounds.set(bet.round_number, new Map())
    const cats = rounds.get(bet.round_number)!
    if (!cats.has(catName)) cats.set(catName, [])
    cats.get(catName)!.push(bet)
  }
  return Array.from(rounds.entries())
    .sort(([a], [b]) => a - b)
    .map(([round, cats]) => ({
      round,
      categories: Array.from(cats.entries())
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([name, bets]) => ({ name, bets })),
    }))
}

const STATUS_VARIANT: Record<string, "default" | "secondary" | "outline"> = {
  open: "default",
  closed: "secondary",
  resolved: "outline",
}

const OUTCOME_VARIANT: Record<
  string,
  "default" | "destructive" | "secondary"
> = {
  hit: "default",
  miss: "destructive",
  push: "secondary",
  void: "secondary",
}

export default async function BetsPage() {
  const supabase = await createClient()

  const { data: tournament } = await supabase
    .from("tournaments")
    .select("id")
    .in("status", ["upcoming", "active"])
    .order("year", { ascending: false })
    .limit(1)
    .maybeSingle()

  if (!tournament) {
    return (
      <div className="flex min-h-[calc(100vh-3.5rem)] items-center justify-center">
        <p className="text-muted-foreground">No bets have been published yet.</p>
      </div>
    )
  }

  const { data: betsData } = await supabase
    .from("bets")
    .select(
      "id, bet_number, description, american_odds, round_number, status, outcome, bet_categories ( name )"
    )
    .eq("tournament_id", (tournament as { id: string }).id)
    .neq("status", "draft")
    .order("round_number")
    .order("bet_number")

  const rawBets = betsData ?? []

  const bets: BetRow[] = rawBets.map((bet) => ({
    ...bet,
    bet_categories: Array.isArray(bet.bet_categories)
      ? (bet.bet_categories[0] ?? null)
      : (bet.bet_categories as BetCategory | null),
  }))

  if (bets.length === 0) {
    return (
      <div className="flex min-h-[calc(100vh-3.5rem)] items-center justify-center">
        <p className="text-muted-foreground">No bets have been published yet.</p>
      </div>
    )
  }

  const rounds = groupBets(bets)

  return (
    <div className="container mx-auto max-w-4xl px-4 py-8 flex flex-col gap-8">
      {rounds.map(({ round, categories }) => (
        <section key={round}>
          <h2 className="text-2xl font-bold mb-4">Round {round}</h2>
          <div className="flex flex-col gap-6">
            {categories.map(({ name, bets }) => (
              <div key={name}>
                <h3 className="mb-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                  {name}
                </h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b text-left text-muted-foreground">
                        <th className="pb-2 pr-4 font-medium">#</th>
                        <th className="pb-2 pr-4 font-medium">Bet</th>
                        <th className="pb-2 pr-4 font-medium">Odds</th>
                        <th className="pb-2 pr-4 font-medium">Fractional</th>
                        <th className="pb-2 pr-4 font-medium">Implied</th>
                        <th className="pb-2 pr-4 font-medium">Status</th>
                        <th className="pb-2 font-medium">Outcome</th>
                      </tr>
                    </thead>
                    <tbody>
                      {bets.map((bet) => (
                        <tr key={bet.id} className="border-b last:border-0">
                          <td className="py-2 pr-4 text-muted-foreground">
                            {bet.bet_number}
                          </td>
                          <td className="py-2 pr-4">{bet.description}</td>
                          <td className="py-2 pr-4 tabular-nums">
                            {bet.american_odds > 0
                              ? `+${bet.american_odds}`
                              : `${bet.american_odds}`}
                          </td>
                          <td className="py-2 pr-4 tabular-nums">
                            {toFractional(bet.american_odds)}
                          </td>
                          <td className="py-2 pr-4 tabular-nums">
                            {toImpliedProbability(bet.american_odds)}
                          </td>
                          <td className="py-2 pr-4">
                            <Badge
                              variant={
                                STATUS_VARIANT[bet.status] ?? "outline"
                              }
                            >
                              {bet.status}
                            </Badge>
                          </td>
                          <td className="py-2">
                            {bet.outcome && (
                              <Badge
                                variant={
                                  OUTCOME_VARIANT[bet.outcome] ?? "secondary"
                                }
                              >
                                {bet.outcome}
                              </Badge>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ))}
          </div>
        </section>
      ))}
    </div>
  )
}
