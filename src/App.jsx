import { useState, useMemo, useRef, useEffect } from "react";
import { jogadores, getIdade, getImagemUrl } from "./data";
import "./App.css";
import corinthiansDLE from '../public/img/icon.png';

const ABREVIACOES = {
  Goleiro: "GOL",
  Zagueiro: "ZAG",
  Lateral: "LAT",
  Volante: "VOL",
  Meia: "MEI",
  Atacante: "ATA"
};

const POSICOES_PROXIMAS = {
  GOL: ["ZAG"],
  ZAG: ["GOL", "LAT"],
  LAT: ["ZAG"],
  VOL: ["MEI"],
  MEI: ["VOL", "ATA"],
  ATA: ["MEI"]
};

function App() {
  const [inputBusca, setInputBusca] = useState("");
  const [tentativas, setTentativas] = useState([]);
  const [jogoAtivo, setJogoAtivo] = useState(true);
  const [mostrarDica, setMostrarDica] = useState(false);
  const [dicaRevelada, setDicaRevelada] = useState(null);
  const [jogoCompleto, setJogoCompleto] = useState(false);
  const [jogadorRevelado, setJogadorRevelado] = useState(false);
  const [indiceSelecionado, setIndiceSelecionado] = useState(-1);
  const [mostrarHistorico, setMostrarHistorico] = useState(false);
  const [historico, setHistorico] = useState({});
  const [primeiraTentativa, setPrimeiraTentativa] = useState(true);
  const inputRef = useRef(null);

  const diaAtual = useMemo(() => new Date().toISOString().split("T")[0], []);
  const seed = diaAtual.split("-").join("");
  const indiceBase = parseInt(seed) % jogadores.length;
  const [jogadorSecreto, setJogadorSecreto] = useState(jogadores[indiceBase]);

  useEffect(() => {
    const dados = localStorage.getItem("corinthians-dle-historico");
    if (dados) setHistorico(JSON.parse(dados));
  }, []);

  useEffect(() => {
    if (jogoCompleto) {
      const dia = diaAtual;
      const novo = { ...historico, [dia]: { tentativas: tentativas.length, acertou: true } };
      localStorage.setItem("corinthians-dle-historico", JSON.stringify(novo));
      setHistorico(novo);
      setTimeout(() => {
        document.getElementById("vitoria")?.scrollIntoView({ behavior: "smooth" });
      }, 300);
    }
  }, [jogoCompleto]);

  const getDica = () => {
    if (!jogadorSecreto) return "";
    if (dicaRevelada) return dicaRevelada;
    const campos = [
      { nome: "Posição", valor: ABREVIACOES[jogadorSecreto.posicao] },
      { nome: "Nacionalidade", valor: jogadorSecreto.nacionalidade },
      { nome: "Altura", valor: `${jogadorSecreto.altura}cm` },
      { nome: "Idade", valor: `${getIdade(jogadorSecreto.nascimento)} anos` },
      { nome: "Ano de chegada", valor: `${jogadorSecreto.ano_chegada}` },
      { nome: "Títulos", valor: `${jogadorSecreto.titulos?.length || 0}` }
    ];
    const camposRevelados = new Set(tentativas.flatMap(t => t.comparacao.map(c => c.campo)));
    const camposNaoRevelados = campos.filter(c => !camposRevelados.has(c.nome));
    if (camposNaoRevelados.length === 0) return "Todos os campos já foram revelados!";
    const indice = tentativas.length % camposNaoRevelados.length;
    return `${camposNaoRevelados[indice].nome}: ${camposNaoRevelados[indice].valor}`;
  };

  const jogadoresChutados = useMemo(() => new Set(tentativas.map(t => t.jogador.nome)), [tentativas]);

  const sugestoes = useMemo(() => {
    let lista = jogadores;
    if (inputBusca.length >= 2) {
      lista = lista.filter(j => j.nome.toLowerCase().includes(inputBusca.toLowerCase()));
    }
    return lista.filter(j => !jogadoresChutados.has(j.nome)).slice(0, 8);
  }, [inputBusca, jogadoresChutados]);

  const getIndicadorPosicao = (chute, alvo) => {
    const abrevChute = ABREVIACOES[chute.posicao];
    const abrevAlvo = ABREVIACOES[alvo.posicao];
    if (abrevChute === abrevAlvo) return { icon: "✓", classe: "igual" };
    const proximas = POSICOES_PROXIMAS[abrevAlvo] || [];
    return { icon: proximas.includes(abrevChute) ? "~" : "✗", classe: proximas.includes(abrevChute) ? "proximo" : "diferente" };
  };

  const getIndicadorNumero = (valorChute, valorAlvo) => {
    if (valorChute === valorAlvo) return { icon: "✓", classe: "igual", valor: valorChute };
    return { icon: valorChute < valorAlvo ? "↑" : "↓", classe: valorChute < valorAlvo ? "menor" : "maior", valor: valorChute };
  };

  const comparar = (chute, alvo) => {
    if (!chute || !alvo) return [];
    const resultado = [];
    resultado.push({ campo: "Posição", ...getIndicadorPosicao(chute, alvo), valorChute: ABREVIACOES[chute.posicao], valorAlvo: ABREVIACOES[alvo.posicao] });
    resultado.push({ campo: "Altura", ...getIndicadorNumero(chute.altura, alvo.altura), valorChute: `${chute.altura}cm`, valorAlvo: `${alvo.altura}cm` });
    resultado.push({ campo: "Idade", ...getIndicadorNumero(getIdade(chute.nascimento), getIdade(alvo.nascimento)), valorChute: `${getIdade(chute.nascimento)} anos`, valorAlvo: `${getIdade(alvo.nascimento)} anos` });
    resultado.push({ campo: "Ano", ...getIndicadorNumero(chute.ano_chegada, alvo.ano_chegada), valorChute: `${chute.ano_chegada}`, valorAlvo: `${alvo.ano_chegada}` });
    resultado.push({ campo: "Títulos", ...getIndicadorNumero(chute.titulos?.length || 0, alvo.titulos?.length || 0), valorChute: `${chute.titulos?.length || 0}`, valorAlvo: `${alvo.titulos?.length || 0}` });
    const nacionalidadeMatch = chute.nacionalidade === alvo.nacionalidade;
    resultado.push({ campo: "Nacionalidade", icon: nacionalidadeMatch ? "✓" : "✗", classe: nacionalidadeMatch ? "igual" : "diferente", valorChute: chute.nacionalidade, valorAlvo: alvo.nacionalidade });
    return resultado;
  };

  const handleSelecionar = (jogador) => {
    if (!jogadorSecreto || !jogoAtivo) return;
    if (jogadoresChutados.has(jogador.nome)) return;
    const acertou = jogador.nome === jogadorSecreto.nome;
    setTentativas([...tentativas, { jogador: jogador, comparacao: comparar(jogador, jogadorSecreto) }]);
    setInputBusca("");
    setIndiceSelecionado(-1);
    if (acertou) {
      setJogoAtivo(false);
      setJogoCompleto(true);
    }
    if (primeiraTentativa) {
      setPrimeiraTentativa(false);
      setTimeout(() => {
        document.getElementById("tabela-tentativas")?.scrollIntoView({ behavior: "smooth" });
      }, 100);
    }
  };

  const handleKeyDown = (e) => {
    if (sugestoes.length === 0) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setIndiceSelecionado(prev => Math.min(prev + 1, sugestoes.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setIndiceSelecionado(prev => Math.max(prev - 1, 0));
    } else if (e.key === "Enter" && indiceSelecionado >= 0) {
      e.preventDefault();
      handleSelecionar(sugestoes[indiceSelecionado]);
    }
  };

  const handleInputBlur = () => {
    setTimeout(() => {
      setInputBusca("");
      setIndiceSelecionado(-1);
    }, 300);
  };

  const gerar_share = () => {
    const emojis = tentativas.map(t => t.comparacao.every(c => c.classe === "igual") ? "🟩" : "🟨");
    return `Corinthians DLE 🏆\nJogador do dia\n${tentativas.length} tentativas\n\n${emojis.join("")}\n\nhttps://corinthians-dle.com`;
  };

  const handleShare = () => {
    navigator.clipboard.writeText(gerar_share());
    alert("Copiado para a área de transferência!");
  };

  const getClasseIcon = (classe) => {
    if (classe === "igual") return "igual";
    if (classe === "proximo") return "proximo";
    if (classe === "menor") return "menor";
    if (classe === "maior") return "maior";
    return "diferente";
  };

  const handleRevelarJogador = () => {
    const faltam = 8 - tentativas.length;
    if (faltam > 0) {
      alert(`Faltam ${faltam} tentativas para liberar!`);
      return;
    }
    setJogadorRevelado(true);
  };

  const handleRevelarDicaBtn = () => {
    const faltam = 5 - tentativas.length;
    if (faltam > 0) {
      alert(`Faltam ${faltam} tentativas para desbloquear a dica!`);
      return;
    }
    setDicaRevelada(getDica());
    setMostrarDica(true);
  };

  const handleSelecionarDia = (dia) => {
    const seed = dia.split("-").join("");
    const indice = parseInt(seed) % jogadores.length;
    setJogadorSecreto(jogadores[indice]);
    setTentativas([]);
    setJogoAtivo(true);
    setJogoCompleto(false);
    setJogadorRevelado(false);
    setMostrarDica(false);
    setDicaRevelada(null);
    setInputBusca("");
    setMostrarHistorico(false);
    setPrimeiraTentativa(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <div className="app">
      <header>
        <img src={corinthiansDLE} alt="Logo"
        height={100} />
        <h1>Corinthians DLE</h1>
        <h2>Adivinhe o jogador do Timão</h2>
        <h3 className="subtitulo">Os dados contém o elenco atual e alguns ídolos.</h3>
        <p className="dia">📅 {new Date().toLocaleDateString("pt-BR")}</p>
        
      </header>

      <div className="busca-container">
        <input
          ref={inputRef}
          type="text"
          placeholder="Digite o nome do jogador..."
          value={inputBusca}
          onChange={(e) => setInputBusca(e.target.value)}
          onBlur={handleInputBlur}
          onKeyDown={handleKeyDown}
          disabled={!jogoAtivo}
        />
        {inputBusca.length >= 2 && sugestoes.length > 0 && (
          <ul className="sugestoes">
            {sugestoes.map((j, i) => (
              <li key={i} onClick={() => handleSelecionar(j)} className={indiceSelecionado === i ? "selecionado" : ""}>
                <img src={getImagemUrl(j)} alt={j.nome} className="avatar-miniatura" />
                <div className="sugestao-info">
                  <span className="nome">{j.nome}</span>
                  <span className="info">{ABREVIACOES[j.posicao]} • {j.nacionalidade}</span>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="misterioso-container">
        {!jogadorRevelado ? (
          <img src={getImagemUrl(jogadorSecreto, "misterio")} alt="Jogador misterioso" className="misterio-foto" />
        ) : (
          <img src={getImagemUrl(jogadorSecreto)} alt="Jogador" className="misterio-foto borrado" />
        )}
        
        <div className="botoes-misterio">
          {tentativas.length >= 8 && !jogoCompleto && !jogadorRevelado && (
            <button className="btn-revelar" onClick={handleRevelarJogador}>Revelar</button>
          )}
          {tentativas.length < 8 && (
            <button className="btn-revelar btn-bloqueado" disabled>Revelar</button>
          )}
          
          {tentativas.length >= 5 && !mostrarDica && jogoAtivo && !dicaRevelada && (
            <button className="btn-dica" onClick={handleRevelarDicaBtn}>💡 Dica</button>
          )}
          {tentativas.length < 5 && (
            <button className="btn-dica btn-bloqueado" disabled>💡 Dica</button>
          )}
        </div>
      </div>

      <div className="tentativas-container" id="tabela-tentativas">
        <p className="contador">Tentativas: {tentativas.length}</p>
        {tentativas.length > 0 && (
          <table className="tabela-comparacao">
            <thead>
              <tr><th>#</th><th>Jogador</th><th>Pos</th><th>Altura</th><th>Idade</th><th>Ano</th><th>Tit</th><th>Nac</th></tr>
            </thead>
            <tbody>
              {[...tentativas].reverse().map((t, i) => (
                <tr key={tentativas.length - 1 - i} className={`linha-tentativa animate-${Math.min(i + 1, 5)}`}>
                  <td className="num-tentativa">{tentativas.length - i}</td>
                  <td className="nome-jogador">
                    <img src={getImagemUrl(t.jogador)} alt={t.jogador.nome} className="avatar-tabela" />
                    {t.jogador.nome}
                  </td>
                  {t.comparacao.map((c, j) => <td key={j} className={getClasseIcon(c.classe)}>{c.valorChute} {c.icon}</td>)}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {dicaRevelada && <div className="dica-box"><p>{dicaRevelada}</p></div>}

      {jogoCompleto && (
        <div className="vitoria" id="vitoria">
          <h2>🎉 ACERTOU!</h2>
          <img src={getImagemUrl(jogadorSecreto)} alt={jogadorSecreto.nome} className="avatar-vitoria" />
          <p className="jogador-secreto">{jogadorSecreto.nome}</p>
          <p className="info-jogador">{jogadorSecreto.posicao} • {jogadorSecreto.nacionalidade}</p>
          <p className="tentativas-finais">{tentativas.length} tentativa{tentativas.length !== 1 ? "s" : ""}</p>
          <button className="btn-share" onClick={handleShare}>📋 Compartilhar</button>
          <button className="btn-historico" onClick={() => setMostrarHistorico(true)}>📅 Jogar Dias Anteriores</button>
        </div>
      )}

      {mostrarHistorico && (
        <div className="modal-overlay" onClick={() => setMostrarHistorico(false)}>
          <div className="modal-historico" onClick={(e) => e.stopPropagation()}>
            <h3>Escolha um dia</h3>
            <ul className="lista-dias">
              {Object.keys(historico).length === 0 ? (
                <li className="sem-dias">Nenhum dia jogado ainda</li>
              ) : (
                Object.entries(historico).sort((a, b) => b[0].localeCompare(a[0])).map(([dia, dados]) => (
                  <li key={dia} onClick={() => handleSelecionarDia(dia)}>
                    <span className="dia-data">{dia}</span>
                    <span className="dia-tentativas">{dados.tentativas} tentativas</span>
                    <span className="dia-status">{dados.acertou ? "✅" : "❌"}</span>
                  </li>
                ))
              )}
            </ul>
            <button className="btn-fechar-modal" onClick={() => setMostrarHistorico(false)}>Fechar</button>
          </div>
        </div>
      )}

      <footer>
        <p className="copyright">© 2026 Corinthians DLE - Timão</p>
      </footer>
    </div>
  );
}

export default App;