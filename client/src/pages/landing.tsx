import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ThemeToggle } from "@/components/theme-toggle";
import {
  Zap,
  Target,
  Shield,
  ArrowRight,
  FileText,
  GitBranch,
  CheckSquare,
  BarChart3,
  Lightbulb,
} from "lucide-react";
import logoImg from "@assets/logo-forge-ai.png?url";

export default function Landing() {
  const features = [
    {
      icon: Lightbulb,
      title: "Briefing Inteligente",
      description:
        "IA interpreta qualquer entrada - texto, áudio ou conversa - e detecta lacunas críticas automaticamente.",
    },
    {
      icon: Target,
      title: "Escopo Automático",
      description:
        "Geração completa de escopo com objetivo, entregáveis, premissas, dependências e riscos.",
    },
    {
      icon: GitBranch,
      title: "Roadmap Inteligente",
      description:
        "Fases, marcos, datas sugeridas e SLAs organizados por metodologia escolhida.",
    },
    {
      icon: Zap,
      title: "Comando para IA Dev",
      description:
        "Prompt estruturado para IAs executoras como Cursor, Devin, Windsurf e ChatGPT Dev.",
    },
    {
      icon: CheckSquare,
      title: "Checklists Inteligentes",
      description:
        "Listas técnicas, comerciais, jurídicas, de entrega e validação geradas automaticamente.",
    },
    {
      icon: BarChart3,
      title: "Controle de Progresso",
      description:
        "Acompanhamento por estágios com cálculo automático de percentual e aprovações.",
    },
  ];

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto px-6 h-16 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <img src={logoImg} alt="Forge AI" className="h-8 object-contain" />
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <ThemeToggle />
            <a href="/login">
              <Button variant="outline" data-testid="button-login">
                Entrar
              </Button>
            </a>
            <a href="/register">
              <Button data-testid="button-register">
                Cadastrar
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </a>
          </div>
        </div>
      </header>

      <main>
        <section className="py-24 px-6">
          <div className="container mx-auto max-w-5xl text-center">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary text-sm font-medium mb-8">
              <Zap className="w-4 h-4" />
              Plataforma de Inteligência para Gestão de Projetos
            </div>
            <h1 className="text-4xl md:text-6xl font-bold tracking-tight mb-6 text-foreground">
              Transforme qualquer briefing em um{" "}
              <span className="text-primary">projeto completo</span>
            </h1>
            <p className="text-lg md:text-xl text-muted-foreground max-w-3xl mx-auto mb-10">
              Com escopo fechado, roadmap inteligente, comando de execução para
              IA, gestão de estágios, controle de progresso e governança total.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <a href="/register">
                <Button
                  size="lg"
                  className="w-full sm:w-auto"
                  data-testid="button-get-started"
                >
                  Criar Conta Grátis
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </a>
              <a href="/login">
                <Button
                  size="lg"
                  variant="outline"
                  className="w-full sm:w-auto"
                  data-testid="button-already-have-account"
                >
                  Já tenho conta
                </Button>
              </a>
            </div>
          </div>
        </section>

        <section className="py-20 px-6 bg-muted/30">
          <div className="container mx-auto max-w-6xl">
            <div className="text-center mb-16">
              <h2 className="text-3xl font-bold mb-4 text-foreground">
                Tudo que você precisa para gerenciar projetos com IA
              </h2>
              <p className="text-muted-foreground max-w-2xl mx-auto">
                Uma plataforma completa que elimina caos operacional, retrabalho
                e falta de previsibilidade.
              </p>
            </div>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {features.map((feature, index) => (
                <Card key={index} className="hover-elevate">
                  <CardContent className="p-6">
                    <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                      <feature.icon className="w-6 h-6 text-primary" />
                    </div>
                    <h3 className="font-semibold mb-2 text-foreground">
                      {feature.title}
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      {feature.description}
                    </p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>

        <section className="py-20 px-6">
          <div className="container mx-auto max-w-4xl">
            <Card className="bg-primary text-primary-foreground">
              <CardContent className="p-12 text-center">
                <h2 className="text-3xl font-bold mb-4">
                  Pronto para transformar sua gestão de projetos?
                </h2>
                <p className="text-primary-foreground/80 mb-8 max-w-2xl mx-auto">
                  Junte-se a empresas que já estão usando IA para entregar
                  projetos com mais qualidade, previsibilidade e margem.
                </p>
                <a href="/api/login">
                  <Button
                    size="lg"
                    variant="secondary"
                    data-testid="button-cta-bottom"
                  >
                    Começar Gratuitamente
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                </a>
              </CardContent>
            </Card>
          </div>
        </section>
      </main>

      <footer className="border-t border-border py-8 px-6">
        <div className="container mx-auto text-center text-sm text-muted-foreground">
          <p>©2025 ForgeAI - Plataforma de Inteligência para Gestão de Projetos - Todos os doreitos reservados</p>
        </div>
      </footer>
    </div>
  );
}
