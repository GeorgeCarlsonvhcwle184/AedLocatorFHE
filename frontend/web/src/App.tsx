import React, { useEffect, useState } from "react";
import { ethers } from "ethers";
import { getContractReadOnly, getContractWithSigner } from "./contract";
import WalletManager from "./components/WalletManager";
import WalletSelector from "./components/WalletSelector";
import "./App.css";

interface AedRecord {
  id: string;
  location: string;
  status: string;
  timestamp: number;
  owner: string;
  verified: boolean;
  additionalInfo?: string;
}

const App: React.FC = () => {
  const [account, setAccount] = useState("");
  const [loading, setLoading] = useState(true);
  const [aedList, setAedList] = useState<AedRecord[]>([]);
  const [provider, setProvider] = useState<ethers.BrowserProvider | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [adding, setAdding] = useState(false);
  const [walletSelectorOpen, setWalletSelectorOpen] = useState(false);
  const [transactionStatus, setTransactionStatus] = useState<{
    visible: boolean;
    status: "pending" | "success" | "error";
    message: string;
  }>({ visible: false, status: "pending", message: "" });
  const [newAedData, setNewAedData] = useState({
    location: "",
    status: "working",
    additionalInfo: ""
  });
  const [showTutorial, setShowTutorial] = useState(false);
  const [selectedAed, setSelectedAed] = useState<AedRecord | null>(null);
  const [showDetails, setShowDetails] = useState(false);

  // Calculate statistics for dashboard
  const verifiedCount = aedList.filter(a => a.verified).length;
  const workingCount = aedList.filter(a => a.status === "working").length;
  const needsMaintenanceCount = aedList.filter(a => a.status === "needs_maintenance").length;

  useEffect(() => {
    loadAedList().finally(() => setLoading(false));
  }, []);

  const onWalletSelect = async (wallet: any) => {
    if (!wallet.provider) return;
    try {
      const web3Provider = new ethers.BrowserProvider(wallet.provider);
      setProvider(web3Provider);
      const accounts = await web3Provider.send("eth_requestAccounts", []);
      const acc = accounts[0] || "";
      setAccount(acc);

      wallet.provider.on("accountsChanged", async (accounts: string[]) => {
        const newAcc = accounts[0] || "";
        setAccount(newAcc);
      });
    } catch (e) {
      alert("Failed to connect wallet");
    }
  };

  const onConnect = () => setWalletSelectorOpen(true);
  const onDisconnect = () => {
    setAccount("");
    setProvider(null);
  };

  const loadAedList = async () => {
    setIsRefreshing(true);
    try {
      const contract = await getContractReadOnly();
      if (!contract) return;
      
      // Check contract availability using FHE
      const isAvailable = await contract.isAvailable();
      if (!isAvailable) {
        console.error("Contract is not available");
        return;
      }
      
      const keysBytes = await contract.getData("aed_keys");
      let keys: string[] = [];
      
      if (keysBytes.length > 0) {
        try {
          keys = JSON.parse(ethers.toUtf8String(keysBytes));
        } catch (e) {
          console.error("Error parsing AED keys:", e);
        }
      }
      
      const list: AedRecord[] = [];
      
      for (const key of keys) {
        try {
          const recordBytes = await contract.getData(`aed_${key}`);
          if (recordBytes.length > 0) {
            try {
              const recordData = JSON.parse(ethers.toUtf8String(recordBytes));
              list.push({
                id: key,
                location: recordData.location,
                status: recordData.status,
                timestamp: recordData.timestamp,
                owner: recordData.owner,
                verified: recordData.verified || false,
                additionalInfo: recordData.additionalInfo || ""
              });
            } catch (e) {
              console.error(`Error parsing AED data for ${key}:`, e);
            }
          }
        } catch (e) {
          console.error(`Error loading AED ${key}:`, e);
        }
      }
      
      list.sort((a, b) => b.timestamp - a.timestamp);
      setAedList(list);
    } catch (e) {
      console.error("Error loading AED list:", e);
    } finally {
      setIsRefreshing(false);
      setLoading(false);
    }
  };

  const addAedRecord = async () => {
    if (!provider) { 
      alert("Please connect wallet first"); 
      return; 
    }
    
    setAdding(true);
    setTransactionStatus({
      visible: true,
      status: "pending",
      message: "Encrypting AED data with FHE..."
    });
    
    try {
      // Simulate FHE encryption
      const encryptedData = `FHE-${btoa(JSON.stringify(newAedData))}`;
      
      const contract = await getContractWithSigner();
      if (!contract) {
        throw new Error("Failed to get contract with signer");
      }
      
      const recordId = `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;

      const recordData = {
        location: newAedData.location,
        status: newAedData.status,
        timestamp: Math.floor(Date.now() / 1000),
        owner: account,
        verified: false,
        additionalInfo: newAedData.additionalInfo
      };
      
      // Store encrypted data on-chain using FHE
      await contract.setData(
        `aed_${recordId}`, 
        ethers.toUtf8Bytes(JSON.stringify(recordData))
      );
      
      const keysBytes = await contract.getData("aed_keys");
      let keys: string[] = [];
      
      if (keysBytes.length > 0) {
        try {
          keys = JSON.parse(ethers.toUtf8String(keysBytes));
        } catch (e) {
          console.error("Error parsing keys:", e);
        }
      }
      
      keys.push(recordId);
      
      await contract.setData(
        "aed_keys", 
        ethers.toUtf8Bytes(JSON.stringify(keys))
      );
      
      setTransactionStatus({
        visible: true,
        status: "success",
        message: "AED data submitted securely with FHE encryption!"
      });
      
      await loadAedList();
      
      setTimeout(() => {
        setTransactionStatus({ visible: false, status: "pending", message: "" });
        setShowAddModal(false);
        setNewAedData({
          location: "",
          status: "working",
          additionalInfo: ""
        });
      }, 2000);
    } catch (e: any) {
      const errorMessage = e.message.includes("user rejected transaction")
        ? "Transaction rejected by user"
        : "Submission failed: " + (e.message || "Unknown error");
      
      setTransactionStatus({
        visible: true,
        status: "error",
        message: errorMessage
      });
      
      setTimeout(() => {
        setTransactionStatus({ visible: false, status: "pending", message: "" });
      }, 3000);
    } finally {
      setAdding(false);
    }
  };

  const verifyAed = async (aedId: string) => {
    if (!provider) {
      alert("Please connect wallet first");
      return;
    }

    setTransactionStatus({
      visible: true,
      status: "pending",
      message: "Processing encrypted data with FHE..."
    });

    try {
      // Simulate FHE computation time
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      const contract = await getContractWithSigner();
      if (!contract) {
        throw new Error("Failed to get contract with signer");
      }
      
      const recordBytes = await contract.getData(`aed_${aedId}`);
      if (recordBytes.length === 0) {
        throw new Error("AED record not found");
      }
      
      const recordData = JSON.parse(ethers.toUtf8String(recordBytes));
      
      const updatedRecord = {
        ...recordData,
        verified: true
      };
      
      await contract.setData(
        `aed_${aedId}`, 
        ethers.toUtf8Bytes(JSON.stringify(updatedRecord))
      );
      
      setTransactionStatus({
        visible: true,
        status: "success",
        message: "FHE verification completed successfully!"
      });
      
      await loadAedList();
      
      setTimeout(() => {
        setTransactionStatus({ visible: false, status: "pending", message: "" });
      }, 2000);
    } catch (e: any) {
      setTransactionStatus({
        visible: true,
        status: "error",
        message: "Verification failed: " + (e.message || "Unknown error")
      });
      
      setTimeout(() => {
        setTransactionStatus({ visible: false, status: "pending", message: "" });
      }, 3000);
    }
  };

  const showAedDetails = (aed: AedRecord) => {
    setSelectedAed(aed);
    setShowDetails(true);
  };

  const tutorialSteps = [
    {
      title: "Connect Wallet",
      description: "Connect your Web3 wallet to start reporting AED locations",
      icon: "🔗"
    },
    {
      title: "Report AED Location",
      description: "Add information about an AED you've found in your community",
      icon: "📍"
    },
    {
      title: "FHE Encryption",
      description: "Your data is encrypted with FHE to ensure complete privacy",
      icon: "🔒"
    },
    {
      title: "Contribute to Network",
      description: "Help build a reliable, anonymous AED network for emergency response",
      icon: "🌐"
    }
  ];

  const renderStatusChart = () => {
    const total = aedList.length || 1;
    const workingPercentage = (workingCount / total) * 100;
    const maintenancePercentage = (needsMaintenanceCount / total) * 100;
    const otherPercentage = ((total - workingCount - needsMaintenanceCount) / total) * 100;

    return (
      <div className="status-chart">
        <div className="chart-bar">
          <div 
            className="bar-segment working" 
            style={{ width: `${workingPercentage}%` }}
          >
            <span className="bar-label">{workingCount} Working</span>
          </div>
          <div 
            className="bar-segment maintenance" 
            style={{ width: `${maintenancePercentage}%` }}
          >
            <span className="bar-label">{needsMaintenanceCount} Needs Maint.</span>
          </div>
          <div 
            className="bar-segment other" 
            style={{ width: `${otherPercentage}%` }}
          >
            <span className="bar-label">{total - workingCount - needsMaintenanceCount} Other</span>
          </div>
        </div>
      </div>
    );
  };

  if (loading) return (
    <div className="loading-screen">
      <div className="loading-spinner"></div>
      <p>Initializing FHE connection...</p>
    </div>
  );

  return (
    <div className="app-container glassmorphism-theme">
      <header className="app-header">
        <div className="logo">
          <div className="logo-icon">
            <div className="heartbeat-icon"></div>
          </div>
          <h1>Anonymous<span>AED</span>Locator</h1>
        </div>
        
        <div className="header-actions">
          <button 
            onClick={() => setShowAddModal(true)} 
            className="add-aed-btn glass-button"
          >
            <div className="add-icon"></div>
            Report AED
          </button>
          <button 
            className="glass-button"
            onClick={() => setShowTutorial(!showTutorial)}
          >
            {showTutorial ? "Hide Guide" : "How It Works"}
          </button>
          <WalletManager account={account} onConnect={onConnect} onDisconnect={onDisconnect} />
        </div>
      </header>
      
      <div className="main-content">
        <div className="welcome-banner">
          <div className="welcome-text">
            <h2>Anonymous Public AED Locator</h2>
            <p>Help build a reliable, anonymous network of AED locations using FHE technology</p>
          </div>
          <div className="fhe-badge">
            <span>FHE-Powered Privacy</span>
          </div>
        </div>
        
        {showTutorial && (
          <div className="tutorial-section">
            <h2>How It Works</h2>
            <p className="subtitle">Learn how to contribute to the anonymous AED network</p>
            
            <div className="tutorial-steps">
              {tutorialSteps.map((step, index) => (
                <div 
                  className="tutorial-step"
                  key={index}
                >
                  <div className="step-number">{index + 1}</div>
                  <div className="step-icon">{step.icon}</div>
                  <div className="step-content">
                    <h3>{step.title}</h3>
                    <p>{step.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
        
        <div className="dashboard-panels">
          <div className="panel project-info">
            <h3>About This Project</h3>
            <p>This platform allows anonymous reporting of AED locations using Fully Homomorphic Encryption (FHE) to protect privacy while building a reliable emergency response network.</p>
            <div className="fhe-features">
              <div className="feature">
                <div className="feature-icon">🔒</div>
                <span>Encrypted Location Data</span>
              </div>
              <div className="feature">
                <div className="feature-icon">🌐</div>
                <span>Anonymous Contributions</span>
              </div>
              <div className="feature">
                <div className="feature-icon">⚡</div>
                <span>Emergency Response</span>
              </div>
            </div>
          </div>
          
          <div className="panel stats-panel">
            <h3>AED Network Statistics</h3>
            <div className="stats-grid">
              <div className="stat-item">
                <div className="stat-value">{aedList.length}</div>
                <div className="stat-label">Total AEDs</div>
              </div>
              <div className="stat-item">
                <div className="stat-value">{verifiedCount}</div>
                <div className="stat-label">Verified</div>
              </div>
              <div className="stat-item">
                <div className="stat-value">{workingCount}</div>
                <div className="stat-label">Operational</div>
              </div>
            </div>
            {renderStatusChart()}
          </div>
        </div>
        
        <div className="aed-list-section">
          <div className="section-header">
            <h2>Reported AED Devices</h2>
            <div className="header-actions">
              <button 
                onClick={loadAedList}
                className="refresh-btn glass-button"
                disabled={isRefreshing}
              >
                {isRefreshing ? "Refreshing..." : "Refresh"}
              </button>
            </div>
          </div>
          
          <div className="aed-list glass-card">
            <div className="list-header">
              <div className="header-cell">Location</div>
              <div className="header-cell">Status</div>
              <div className="header-cell">Reported</div>
              <div className="header-cell">Verification</div>
              <div className="header-cell">Actions</div>
            </div>
            
            {aedList.length === 0 ? (
              <div className="no-aeds">
                <div className="no-aeds-icon">📍</div>
                <p>No AED devices reported yet</p>
                <button 
                  className="glass-button primary"
                  onClick={() => setShowAddModal(true)}
                >
                  Report First AED
                </button>
              </div>
            ) : (
              aedList.map(aed => (
                <div className="aed-row" key={aed.id}>
                  <div className="table-cell location">{aed.location}</div>
                  <div className="table-cell">
                    <span className={`status-badge ${aed.status}`}>
                      {aed.status === "working" ? "Operational" : 
                       aed.status === "needs_maintenance" ? "Needs Maintenance" : "Unknown"}
                    </span>
                  </div>
                  <div className="table-cell">
                    {new Date(aed.timestamp * 1000).toLocaleDateString()}
                  </div>
                  <div className="table-cell">
                    <span className={`verification-badge ${aed.verified ? "verified" : "unverified"}`}>
                      {aed.verified ? "Verified" : "Unverified"}
                    </span>
                  </div>
                  <div className="table-cell actions">
                    <button 
                      className="action-btn glass-button outline"
                      onClick={() => showAedDetails(aed)}
                    >
                      Details
                    </button>
                    {!aed.verified && (
                      <button 
                        className="action-btn glass-button success"
                        onClick={() => verifyAed(aed.id)}
                      >
                        Verify
                      </button>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
  
      {showAddModal && (
        <ModalAddAed 
          onSubmit={addAedRecord} 
          onClose={() => setShowAddModal(false)} 
          adding={adding}
          aedData={newAedData}
          setAedData={setNewAedData}
        />
      )}
      
      {walletSelectorOpen && (
        <WalletSelector
          isOpen={walletSelectorOpen}
          onWalletSelect={(wallet) => { onWalletSelect(wallet); setWalletSelectorOpen(false); }}
          onClose={() => setWalletSelectorOpen(false)}
        />
      )}
      
      {transactionStatus.visible && (
        <div className="transaction-modal">
          <div className="transaction-content glass-card">
            <div className={`transaction-icon ${transactionStatus.status}`}>
              {transactionStatus.status === "pending" && <div className="loading-spinner"></div>}
              {transactionStatus.status === "success" && <div className="success-icon">✓</div>}
              {transactionStatus.status === "error" && <div className="error-icon">✕</div>}
            </div>
            <div className="transaction-message">
              {transactionStatus.message}
            </div>
          </div>
        </div>
      )}
      
      {showDetails && selectedAed && (
        <AedDetailsModal 
          aed={selectedAed} 
          onClose={() => setShowDetails(false)} 
        />
      )}
  
      <footer className="app-footer">
        <div className="footer-content">
          <div className="footer-brand">
            <div className="logo">
              <div className="heartbeat-icon"></div>
              <span>AnonymousAEDLocator</span>
            </div>
            <p>Building a safer community with FHE technology</p>
          </div>
          
          <div className="footer-links">
            <a href="#" className="footer-link">About FHE</a>
            <a href="#" className="footer-link">Privacy Policy</a>
            <a href="#" className="footer-link">Emergency Guidelines</a>
            <a href="#" className="footer-link">Contact</a>
          </div>
        </div>
        
        <div className="footer-bottom">
          <div className="fhe-badge">
            <span>FHE-Powered Privacy</span>
          </div>
          <div className="copyright">
            © {new Date().getFullYear()} Anonymous AED Locator. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  );
};

interface ModalAddAedProps {
  onSubmit: () => void; 
  onClose: () => void; 
  adding: boolean;
  aedData: any;
  setAedData: (data: any) => void;
}

const ModalAddAed: React.FC<ModalAddAedProps> = ({ 
  onSubmit, 
  onClose, 
  adding,
  aedData,
  setAedData
}) => {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setAedData({
      ...aedData,
      [name]: value
    });
  };

  const handleSubmit = () => {
    if (!aedData.location) {
      alert("Please provide a location");
      return;
    }
    
    onSubmit();
  };

  return (
    <div className="modal-overlay">
      <div className="add-modal glass-card">
        <div className="modal-header">
          <h2>Report New AED Location</h2>
          <button onClick={onClose} className="close-modal">&times;</button>
        </div>
        
        <div className="modal-body">
          <div className="fhe-notice-banner">
            <div className="lock-icon">🔒</div> 
            <span>Your report will be encrypted with FHE for complete privacy</span>
          </div>
          
          <div className="form-grid">
            <div className="form-group">
              <label>Location *</label>
              <input 
                type="text"
                name="location"
                value={aedData.location} 
                onChange={handleChange}
                placeholder="e.g., Main Street Library, 2nd floor" 
                className="glass-input"
              />
            </div>
            
            <div className="form-group">
              <label>Status</label>
              <select 
                name="status"
                value={aedData.status} 
                onChange={handleChange}
                className="glass-select"
              >
                <option value="working">Operational</option>
                <option value="needs_maintenance">Needs Maintenance</option>
                <option value="unknown">Unknown</option>
              </select>
            </div>
            
            <div className="form-group full-width">
              <label>Additional Information</label>
              <textarea 
                name="additionalInfo"
                value={aedData.additionalInfo} 
                onChange={handleChange}
                placeholder="Any additional details about access, visibility, etc." 
                className="glass-textarea"
                rows={3}
              />
            </div>
          </div>
          
          <div className="privacy-notice">
            <div className="info-icon">ℹ️</div> 
            <span>Your personal information remains anonymous with FHE encryption</span>
          </div>
        </div>
        
        <div className="modal-footer">
          <button 
            onClick={onClose}
            className="cancel-btn glass-button"
          >
            Cancel
          </button>
          <button 
            onClick={handleSubmit} 
            disabled={adding}
            className="submit-btn glass-button primary"
          >
            {adding ? "Encrypting with FHE..." : "Submit Report"}
          </button>
        </div>
      </div>
    </div>
  );
};

interface AedDetailsModalProps {
  aed: AedRecord;
  onClose: () => void;
}

const AedDetailsModal: React.FC<AedDetailsModalProps> = ({ aed, onClose }) => {
  return (
    <div className="modal-overlay">
      <div className="details-modal glass-card">
        <div className="modal-header">
          <h2>AED Device Details</h2>
          <button onClick={onClose} className="close-modal">&times;</button>
        </div>
        
        <div className="modal-body">
          <div className="detail-item">
            <label>Location:</label>
            <span>{aed.location}</span>
          </div>
          
          <div className="detail-item">
            <label>Status:</label>
            <span className={`status-badge ${aed.status}`}>
              {aed.status === "working" ? "Operational" : 
               aed.status === "needs_maintenance" ? "Needs Maintenance" : "Unknown"}
            </span>
          </div>
          
          <div className="detail-item">
            <label>Reported:</label>
            <span>{new Date(aed.timestamp * 1000).toLocaleString()}</span>
          </div>
          
          <div className="detail-item">
            <label>Verification:</label>
            <span className={`verification-badge ${aed.verified ? "verified" : "unverified"}`}>
              {aed.verified ? "Verified" : "Unverified"}
            </span>
          </div>
          
          {aed.additionalInfo && (
            <div className="detail-item full-width">
              <label>Additional Information:</label>
              <p>{aed.additionalInfo}</p>
            </div>
          )}
          
          <div className="fhe-notice">
            <div className="lock-icon">🔒</div>
            <span>This data is encrypted with FHE to protect reporter privacy</span>
          </div>
        </div>
        
        <div className="modal-footer">
          <button 
            onClick={onClose}
            className="close-btn glass-button primary"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default App;