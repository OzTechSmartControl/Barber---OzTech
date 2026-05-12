
import React, { useState, useEffect } from 'react';
import { Button } from 'react-bootstrap';
import T from "../../config/theme";
import { Plus } from 'lucide-react';

function App() {
    const [accessCortesias, setAccessCortesias] = useState([]);
    const [isLoading, setIsLoading] = useState(true);

    // Fetching cortesias data, assuming API call to get the list of cortesias
    useEffect(() => {
        const fetchCortesias = async () => {
            // Simulating a fetch call to get cortesias data
            setIsLoading(true);
            const response = await fetch("/api/cortesias");
            const data = await response.json();
            setAccessCortesias(data);
            setIsLoading(false);
        };

        fetchCortesias();
    }, []);

    // Handle new cortesias access
    const handleNewAccess = () => {
        // Here should go the logic to handle new cortesias creation
        alert("Criando novo acesso cortesia!");
    };

    return (
        <div style={{ padding: "20px" }}>
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

            {isLoading ? (
                <div>Carregando...</div>
            ) : (
                <div>
                    <h5>Cortesias Ativas</h5>
                    <ul>
                        {accessCortesias.map((corte, index) => (
                            <li key={index}>{corte.nome}</li>
                        ))}
                    </ul>
                </div>
            )}
        </div>
    );
}

export default App;
