import React, { useState, useEffect } from 'react';
import { Button, Card, Row, Col } from 'react-bootstrap';
import T from "../../config/theme";  // Corrigido para refletir o caminho correto.
import { Plus } from 'lucide-react';

// Simulação de dados de cortesias
const mockCortesias = [
  { nome: 'Cortezia 1', status: 'Ativa', barbearia: 'Barbearia A' },
  { nome: 'Cortezia 2', status: 'Ativa', barbearia: 'Barbearia B' },
  { nome: 'Cortezia 3', status: 'Expirada', barbearia: 'Barbearia C' }
];

function App() {
  const [accessCortesias, setAccessCortesias] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  // Carregar cortesias de uma API fictícia
  useEffect(() => {
    // Simulando a obtenção dos dados das cortesias
    setIsLoading(true);
    setTimeout(() => {
      setAccessCortesias(mockCortesias);
      setIsLoading(false);
    }, 1000);
  }, []);

  // Função de criação de novo acesso cortesia
  const handleNewAccess = () => {
    alert("Novo acesso cortesia foi criado!");
    // Aqui, você deve implementar a lógica de criação de um novo acesso cortesia
  };

  return (
    <div style={{ padding: "20px" }}>
      {/* Painel de Cortesias */}
      <div style={{ marginBottom: "20px" }}>
        <h3>Gestão de Cortesias</h3>
        <Button 
          onClick={handleNewAccess} 
          variant="primary"
          style={{
            backgroundColor: T.accent,
            borderColor: T.accent,
            color: T.text
          }}
        >
          <Plus size={16} style={{ marginRight: "8px" }} /> + Novo acesso cortesia
        </Button>
      </div>

      {/* Lista de Cortesias */}
      {isLoading ? (
        <div>Carregando...</div>
      ) : (
        <div>
          <h5>Cortesias Ativas</h5>
          <Row>
            {accessCortesias.map((corte, index) => (
              <Col md={4} key={index} style={{ marginBottom: "20px" }}>
                <Card
                  style={{
                    border: `1px solid ${T.border}`,
                    borderRadius: "8px",
                    background: T.card,
                    boxShadow: "0 12px 40px rgba(0,0,0,.20)",
                    transition: "all .18s ease"
                  }}
                >
                  <Card.Body>
                    <Card.Title>{corte.nome}</Card.Title>
                    <Card.Text>
                      Status: {corte.status}
                    </Card.Text>
                    <Card.Text>
                      Barbearia: {corte.barbearia}
                    </Card.Text>
                  </Card.Body>
                </Card>
              </Col>
            ))}
          </Row>
        </div>
      )}
    </div>
  );
}

export default App;