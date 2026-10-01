import { readFileSync } from "fs";
import { join } from "path";
import { describe, expect, it } from "vitest";
import { mapTmPosition, parseFee, parseHeight, parseLeagueTransfers, parseMoney, parseSquad, parseValueHistory } from "../src/integrations/transfermarkt/parse";
import { matchSquad, matchTransfers, pickTransfermarktOnly } from "../src/sync/transfermarkt";
import { nameSimilarity } from "../src/lib/names";
import { countryCodeFromEnglish } from "../src/lib/i18n";

const fixture = (name: string) => readFileSync(join(__dirname, "fixtures", name), "utf8");

describe("money and fees", () => {
  it("parses market value notation", () => {
    expect(parseMoney("€250k")).toBe(250_000);
    expect(parseMoney("€1.20m")).toBe(1_200_000);
    expect(parseMoney("€9k")).toBe(9_000);
    expect(parseMoney("-")).toBeNull();
    expect(parseMoney("")).toBeNull();
  });
  it("classifies fee cells", () => {
    expect(parseFee("€250k")).toEqual({ type: "FEE", amount: 250_000 });
    expect(parseFee("free transfer")).toEqual({ type: "FREE", amount: null });
    expect(parseFee("loan transfer")).toEqual({ type: "LOAN", amount: null });
    expect(parseFee("End of loan")).toEqual({ type: "END_OF_LOAN", amount: null });
    expect(parseFee("Loan fee:€9k")).toEqual({ type: "LOAN_FEE", amount: 9_000 });
    expect(parseFee("-")).toEqual({ type: "UNKNOWN", amount: null });
    expect(parseFee("?")).toEqual({ type: "UNKNOWN", amount: null });
  });
  it("maps positions and countries", () => {
    expect(mapTmPosition("Centre-Back")).toBe("DF");
    expect(mapTmPosition("Left Winger")).toBe("FW");
    expect(mapTmPosition("Defensive Midfield")).toBe("MF");
    expect(mapTmPosition("Goalkeeper")).toBe("GK");
    expect(countryCodeFromEnglish("Finland")).toBe("FI");
    expect(countryCodeFromEnglish("Nowhere")).toBeNull();
  });
});

describe("page parsers (real Transfermarkt markup)", () => {
  it("parses the league transfers page per club", () => {
    const clubs = parseLeagueTransfers(fixture("tm-league-transfers.html"));
    expect(clubs.map((c) => c.tmClubId)).toEqual([10482, 22220, 10540]);
    const kairat = clubs[0];
    expect(kairat.clubName).toBe("Kairat Almaty");
    expect(kairat.arrivals.length).toBeGreaterThan(5);
    expect(kairat.departures.length).toBeGreaterThan(5);
    expect(kairat.arrivals[0]).toMatchObject({
      tmPlayerId: 674212,
      name: "Oiva Jukkola",
      age: 23,
      nationality: "Finland",
      position: "Left Winger",
      marketValue: 450_000,
      counterClub: { tmId: 3189, name: "Ilves Tampere" },
      fee: { type: "FEE", amount: 250_000 },
    });
    const loanFee = clubs[2].arrivals.find((r) => r.fee.type === "LOAN_FEE");
    expect(loanFee?.fee.amount).toBe(9_000);
  });

  it("parses the detailed squad page", () => {
    const squad = parseSquad(fixture("tm-squad.html"));
    expect(squad[0]).toEqual({
      tmPlayerId: 724942,
      name: "Temirlan Anarbekov",
      number: 1,
      birthDate: "2003-10-14",
      nationality: "Kazakhstan",
      marketValue: 800_000,
      contractUntil: "2028-12-31",
      heightCm: 190,
      foot: "left",
    });
    expect(squad.find((p) => p.name === "Danila Buch")?.marketValue).toBeNull();
  });
});

describe("matching", () => {
  it("treats romanization variants as the same name", () => {
    expect(nameSimilarity("Aleksandr Shirobokov", "Alexandr SHIROBOKOV")).toBe(1);
    expect(nameSimilarity("Abylaykhan Nazymkhanov", "Abylaikhan NAZYMKHANOV")).toBe(1);
    expect(nameSimilarity("Aybar Zhaksylykov", "Айбар Жақсылықов")).toBe(1);
    expect(nameSimilarity("Egor Tkachenko", "Egor Sorokin")).toBe(0.5);
  });

  it("matches squads by birth date first", () => {
    const tmSquad = [
      { tmPlayerId: 1, name: "Temirlan Anarbekov", number: 1, birthDate: "2003-10-14", nationality: null, marketValue: 800_000, contractUntil: null },
      { tmPlayerId: 2, name: "Luís Mata", number: 3, birthDate: "1997-01-10", nationality: null, marketValue: 400_000, contractUntil: null },
    ];
    const ours = [
      { id: "a", name: "Темирлан Анарбеков", nameEn: "Temirlan Anarbekov", birthDate: new Date("2003-10-14T00:00:00Z") },
      { id: "b", name: "Луис Карлос Машаду Мата", nameEn: "Luis Carlos Machado Mata", birthDate: new Date("1997-01-10T00:00:00Z") },
      { id: "c", name: "Однофамилец", nameEn: "Temirlan Other", birthDate: new Date("2001-01-01T00:00:00Z") },
    ];
    expect([...matchSquad(tmSquad, ours)]).toEqual([
      [1, "a"],
      [2, "b"],
    ]);
  });

  it("matches transfers and keeps look-alikes out of the Transfermarkt-only list", () => {
    const row = (tmPlayerId: number, name: string, age: number) => ({
      tmPlayerId,
      name,
      age,
      nationality: null,
      position: null,
      marketValue: null,
      counterClub: null,
      fee: { type: "FREE" as const, amount: null },
      tmTransferId: tmPlayerId * 10,
    });
    const rows = [row(1, "Arman Kenesov", 24), row(1, "Arman Kenesov", 24), row(2, "Ivan Basic", 23), row(3, "Nani", 39)];
    const ours = [
      { id: "x", name: "Арман Кенесов", nameEn: "Arman Kenessov", age: 25, playerTmId: null },
      { id: "y", name: "Ян Атанасов", nameEn: "Yani Atanasov", age: 26, playerTmId: null },
    ];
    const matches = matchTransfers(rows, ours);
    expect([...matches]).toEqual([[0, "x"]]);
    // Row 1 duplicates a matched player; "Nani" is a single-token name that could be anyone.
    expect(pickTransfermarktOnly(rows, matches, ours).map((r) => r.name)).toEqual(["Ivan Basic"]);
  });
});

describe("profile extras", () => {
  it("parses height and value history", () => {
    expect(parseHeight("1,90m")).toBe(190);
    expect(parseHeight("")).toBeNull();
    const points = parseValueHistory({
      list: [
        { x: 1487026800000, y: 500000, verein: "Heart of Midlothian FC", age: "25" },
        { x: 1425337200000, y: 200000, verein: "Litex Lovech", age: "23" },
        { x: "bad", y: 1 },
      ],
    });
    expect(points).toEqual([
      { date: "2015-03-02", value: 200000, club: "Litex Lovech", age: 23 },
      { date: "2017-02-13", value: 500000, club: "Heart of Midlothian FC", age: 25 },
    ]);
    expect(parseValueHistory(null)).toEqual([]);
  });
});
