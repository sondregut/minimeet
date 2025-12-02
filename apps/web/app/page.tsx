import Link from 'next/link';
import {
  Trophy,
  Users,
  ClipboardList,
  Globe,
  Timer,
  BarChart3,
  CheckCircle
} from 'lucide-react';

export default function HomePage() {
  return (
    <main className="min-h-screen bg-background">
      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-br from-primary-dark via-primary to-primary-light">
        <div className="absolute inset-0 bg-[url('/grid.svg')] opacity-10" />
        <div className="relative max-w-6xl mx-auto px-6 py-24 md:py-32">
          <div className="text-center">
            <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-sm rounded-full px-4 py-2 mb-6">
              <span className="w-2 h-2 bg-accent rounded-full animate-pulse" />
              <span className="text-white/90 text-sm font-medium">
                Gratis for små klubber
              </span>
            </div>
            <h1 className="text-4xl md:text-6xl font-extrabold text-white mb-6 tracking-tight">
              Friidrettsstevne
            </h1>
            <p className="text-xl md:text-2xl text-white/80 mb-8 max-w-2xl mx-auto">
              Enkel stevneadministrasjon for norsk friidrett.
              Fra påmelding til live resultater.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                href="/signup"
                className="inline-flex items-center justify-center px-8 py-4 text-lg font-semibold text-primary bg-white rounded-lg hover:bg-gray-100 transition-all shadow-lg hover:shadow-xl"
              >
                Kom i gang gratis
              </Link>
              <Link
                href="/login"
                className="inline-flex items-center justify-center px-8 py-4 text-lg font-semibold text-white border-2 border-white/30 rounded-lg hover:bg-white/10 transition-all"
              >
                Logg inn
              </Link>
            </div>
          </div>
        </div>
        {/* Wave decoration */}
        <div className="absolute bottom-0 left-0 right-0">
          <svg viewBox="0 0 1440 120" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M0 120L60 110C120 100 240 80 360 70C480 60 600 60 720 65C840 70 960 80 1080 85C1200 90 1320 90 1380 90L1440 90V120H1380C1320 120 1200 120 1080 120C960 120 840 120 720 120C600 120 480 120 360 120C240 120 120 120 60 120H0Z" fill="white"/>
          </svg>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
              Alt du trenger for et vellykket stevne
            </h2>
            <p className="text-lg text-foreground-secondary max-w-2xl mx-auto">
              Spar tid og få oversikt med moderne verktøy for friidrettsarrangører
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {/* Feature 1 */}
            <div className="card hover:shadow-lg transition-shadow">
              <div className="w-12 h-12 bg-accent/10 rounded-lg flex items-center justify-center mb-4">
                <Timer className="w-6 h-6 text-accent" />
              </div>
              <h3 className="text-xl font-semibold text-foreground mb-2">
                Live resultater
              </h3>
              <p className="text-foreground-secondary">
                Publikum følger stevnet i sanntid. Automatisk oppdatering av tider, høyder og lengder.
              </p>
            </div>

            {/* Feature 2 */}
            <div className="card hover:shadow-lg transition-shadow">
              <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mb-4">
                <Users className="w-6 h-6 text-primary" />
              </div>
              <h3 className="text-xl font-semibold text-foreground mb-2">
                Påmelding
              </h3>
              <p className="text-foreground-secondary">
                Utøvere melder seg på via nettskjema. Du godkjenner og får oversikt over alle deltakere.
              </p>
            </div>

            {/* Feature 3 */}
            <div className="card hover:shadow-lg transition-shadow">
              <div className="w-12 h-12 bg-success/10 rounded-lg flex items-center justify-center mb-4">
                <ClipboardList className="w-6 h-6 text-success" />
              </div>
              <h3 className="text-xl font-semibold text-foreground mb-2">
                Startlister & heat
              </h3>
              <p className="text-foreground-secondary">
                Generer startlister automatisk. Del inn i heat med smart seeding basert på PB.
              </p>
            </div>

            {/* Feature 4 */}
            <div className="card hover:shadow-lg transition-shadow">
              <div className="w-12 h-12 bg-info/10 rounded-lg flex items-center justify-center mb-4">
                <Globe className="w-6 h-6 text-info" />
              </div>
              <h3 className="text-xl font-semibold text-foreground mb-2">
                Offentlig resultatside
              </h3>
              <p className="text-foreground-secondary">
                Del lenke til resultater. Ingen innlogging for tilskuere. Funker på mobil.
              </p>
            </div>

            {/* Feature 5 */}
            <div className="card hover:shadow-lg transition-shadow">
              <div className="w-12 h-12 bg-warning/10 rounded-lg flex items-center justify-center mb-4">
                <Trophy className="w-6 h-6 text-warning" />
              </div>
              <h3 className="text-xl font-semibold text-foreground mb-2">
                Rekorder & PB
              </h3>
              <p className="text-foreground-secondary">
                Automatisk deteksjon av personlige rekorder, stevnerekorder og klubbrekorder.
              </p>
            </div>

            {/* Feature 6 */}
            <div className="card hover:shadow-lg transition-shadow">
              <div className="w-12 h-12 bg-accent/10 rounded-lg flex items-center justify-center mb-4">
                <BarChart3 className="w-6 h-6 text-accent" />
              </div>
              <h3 className="text-xl font-semibold text-foreground mb-2">
                Kontrollsenter
              </h3>
              <p className="text-foreground-secondary">
                Se alt som skjer i stevnet fra én skjerm. Status, progresjon og kommende øvelser.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Target Audience Section */}
      <section className="py-20 px-6 bg-background-secondary">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
              Laget for norsk friidrett
            </h2>
            <p className="text-lg text-foreground-secondary">
              Perfekt for klubber, kretser og skoler
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="w-16 h-16 bg-primary rounded-2xl flex items-center justify-center mx-auto mb-4">
                <Users className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-xl font-semibold text-foreground mb-2">Klubbstevner</h3>
              <p className="text-foreground-secondary">
                Interne stevner, klubbmesterskap og treningskonkurranser
              </p>
            </div>

            <div className="text-center">
              <div className="w-16 h-16 bg-accent rounded-2xl flex items-center justify-center mx-auto mb-4">
                <Trophy className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-xl font-semibold text-foreground mb-2">Kretsstevner</h3>
              <p className="text-foreground-secondary">
                Regionale mesterskap og karusellstevner
              </p>
            </div>

            <div className="text-center">
              <div className="w-16 h-16 bg-success rounded-2xl flex items-center justify-center mx-auto mb-4">
                <BarChart3 className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-xl font-semibold text-foreground mb-2">Skolestevner</h3>
              <p className="text-foreground-secondary">
                Skolemesterskap og friidrettsdager
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Benefits Section */}
      <section className="py-20 px-6">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
              Hvorfor Friidrettsstevne?
            </h2>
          </div>

          <div className="space-y-4">
            {[
              'Norsk grensesnitt og terminologi',
              'Støtter alle øvelser – løp, hopp og kast',
              'Fungerer på mobil, nettbrett og PC',
              'Ingen installasjon – alt i nettleseren',
              'Eksporter startlister og resultater',
              'Gratis for små arrangører',
            ].map((benefit, index) => (
              <div key={index} className="flex items-center gap-4 p-4 bg-background-secondary rounded-lg">
                <CheckCircle className="w-6 h-6 text-success flex-shrink-0" />
                <span className="text-foreground font-medium">{benefit}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-6 bg-gradient-to-br from-primary-dark via-primary to-primary-light">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
            Klar til å arrangere stevne?
          </h2>
          <p className="text-xl text-white/80 mb-8">
            Opprett konto gratis og kom i gang på minutter
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/signup"
              className="inline-flex items-center justify-center px-8 py-4 text-lg font-semibold text-primary bg-white rounded-lg hover:bg-gray-100 transition-all shadow-lg"
            >
              Opprett gratis konto
            </Link>
            <Link
              href="/results"
              className="inline-flex items-center justify-center px-8 py-4 text-lg font-semibold text-white border-2 border-white/30 rounded-lg hover:bg-white/10 transition-all"
            >
              Se eksempel på resultater
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 px-6 bg-foreground">
        <div className="max-w-6xl mx-auto">
          <div className="flex flex-col md:flex-row justify-between items-center gap-6">
            <div>
              <h3 className="text-xl font-bold text-white mb-1">Friidrettsstevne</h3>
              <p className="text-white/60 text-sm">
                Stevneadministrasjon for norsk friidrett
              </p>
            </div>
            <div className="flex gap-6">
              <Link href="/login" className="text-white/60 hover:text-white transition-colors">
                Logg inn
              </Link>
              <Link href="/signup" className="text-white/60 hover:text-white transition-colors">
                Registrer
              </Link>
              <Link href="/results" className="text-white/60 hover:text-white transition-colors">
                Resultater
              </Link>
            </div>
          </div>
          <div className="border-t border-white/10 mt-8 pt-8 text-center">
            <p className="text-white/40 text-sm">
              © {new Date().getFullYear()} Friidrettsstevne. Laget med kjærlighet for norsk friidrett.
            </p>
          </div>
        </div>
      </footer>
    </main>
  );
}
