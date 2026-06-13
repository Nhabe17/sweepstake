import type { Match, Player, Settings, Team } from '@/lib/types';
import MatchCard from './MatchCard';

// Resolves team/owner from the data view, then renders a MatchCard.
export default function MatchCardResolved({
  match,
  teamById,
  ownerOf,
  settings,
}: {
  match: Match;
  teamById: (id: string) => Team | undefined;
  ownerOf: (team: Team | null | undefined) => Player | null;
  settings: Settings;
}) {
  const homeTeam = teamById(match.homeTeamId);
  const awayTeam = teamById(match.awayTeamId);
  return (
    <MatchCard
      match={match}
      homeTeam={homeTeam}
      awayTeam={awayTeam}
      homeOwner={ownerOf(homeTeam)}
      awayOwner={ownerOf(awayTeam)}
      settings={settings}
    />
  );
}
