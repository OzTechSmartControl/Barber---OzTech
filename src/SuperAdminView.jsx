
import React, { useState, useEffect } from 'react';
import { Check, Loader2 } from 'lucide-react';
import Modal from './Modal';
import { useHistory } from 'react-router-dom';

function SuperAdminView() {
  const [savingCourtesy, setSavingCourtesy] = useState(false);
  const [courtesySuccess, setCourtesySuccess] = useState(false);
  const [savingForm, setSavingForm] = useState(false);

  const history = useHistory();

  const saveCourtesy = () => {
    setSavingCourtesy(true);
    // Simulate an API call to save the courtesy
    setTimeout(() => {
      setSavingCourtesy(false);
      setCourtesySuccess(true);
      // Return to the dashboard after 2 seconds
      setTimeout(() => {
        history.push('/dashboard');
      }, 2000);
    }, 3000);
  };

  return (
    <div style={{ padding: '24px', marginTop: '24px' }}>
      <header style={{ position: 'fixed', top: 0, left: 0, right: 0, zIndex: 10, backgroundColor: '#111111', padding: '16px 24px', borderBottom: '1px solid #444444' }}>
        <h1 style={{ fontSize: '24px', color: '#fff' }}>Dashboard</h1>
      </header>

      <div style={{ marginTop: '80px' }}>
        {/* Modal Content */}
        <Modal isOpen={savingForm} onClose={() => setSavingForm(false)}>
          <button onClick={saveCourtesy}>
            {savingCourtesy ? (
              <Loader2 size={15} style={{ animation: 'spin 1s linear infinite' }} />
            ) : (
              <Check size={15} />
            )}
            {savingCourtesy ? 'Salvando...' : 'Liberar cortesia'}
          </button>
        </Modal>

        <h2>Novos Clientes</h2>
        {/* Your content */}
      </div>
    </div>
  );
}

export default SuperAdminView;
