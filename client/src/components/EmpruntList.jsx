import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import './../styles/booklist.css'

const EmpruntList = () => {
    const navigate = useNavigate()
    const [emprunts, setEmprunts] = useState([])
    const [showModal, setShowModal] = useState(false)
    const [selectedEmprunt, setSelectedEmprunt] = useState(null)
    const [loading, setLoading] = useState(false)
    const [user, setUser] = useState(null)
    const base = import.meta.env.VITE_BASE_URL || '/'

    useEffect(() => {
        // Primero obtener la información del usuario
        fetch(base + 'api/session', {
            credentials: 'include'
        })
            .then(response => {
                if (response.status === 200) return response.json()
                else throw new Error("Account not found")
            })
            .then(data => {
                setUser(data.user)
                fetchEmprunts()
            })
            .catch(error => {
                console.error('Error getting user session:', error)
                navigate('/login')
            })
    }, [])

    const fetchEmprunts = () => {
        fetch(base + 'api/emprunts', {
            credentials: 'include'
        })
            .then(response => response.json())
            .then(data => setEmprunts(data))
            .catch(error => console.error('Erreur:', error))
    }

    const handleRetournerClick = (emprunt) => {
        setSelectedEmprunt(emprunt)
        setShowModal(true)
    }

    const handleCloseModal = () => {
        setShowModal(false)
        setSelectedEmprunt(null)
    }

    const handleConfirmRetour = async () => {
        setLoading(true)

        try {
            const response = await fetch(base + `api/emprunts/${selectedEmprunt.id}/retourner`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json'
                },
                credentials: 'include'
            })

            if (response.ok) {
                const result = await response.json()
                alert('Livre retourné avec succès!')
                
                // Actualizar la lista de emprunts
                fetchEmprunts()
                handleCloseModal()
            } else {
                const error = await response.json()
                alert('Erreur: ' + (error.error || 'Impossible de retourner le livre'))
            }
        } catch (error) {
            console.error('Erreur:', error)
            alert('Erreur lors du retour du livre')
        } finally {
            setLoading(false)
        }
    }

    const handleHome = () => {
        navigate('/')
    }

    const formatDate = (dateString) => {
        return new Date(dateString).toLocaleDateString('fr-FR')
    }

    const getStatusColor = (status) => {
        switch (status) {
            case 'retourné':
                return '#28a745' // vert
            case 'delayed':
                return '#dc3545' // rouge
            case 'en cours':
                return '#007bff' // bleu
            default:
                return '#6c757d' // gris
        }
    }

    const getStatusText = (status) => {
        switch (status) {
            case 'retourné':
                return 'Retourné'
            case 'delayed':
                return 'En retard'
            case 'en cours':
                return 'En cours'
            default:
                return status
        }
    }

    return (
        <div className="container">
            <h2>Mes Emprunts - Librairie XYZ</h2>
            {emprunts.length > 0 ? (
                <table>
                    <thead>
                        <tr>
                            <th>Image</th>
                            <th>Livre</th>
                            <th>Auteur</th>
                            <th>Date Emprunt</th>
                            <th>Date Retour Prévue</th>
                            <th>Date Retour Effective</th>
                            <th>Statut</th>
                            <th>Action</th>
                        </tr>
                    </thead>
                    <tbody>
                        {emprunts.map(emprunt => (
                            <tr key={emprunt.id}>
                                <td>
                                    <img className="book-image" src={emprunt.photo_url} alt={emprunt.titre} />
                                </td>
                                <td>{emprunt.titre}</td>
                                <td>{emprunt.auteur}</td>
                                <td>{formatDate(emprunt.date_emprunt)}</td>
                                <td>{formatDate(emprunt.date_retour_prevue)}</td>
                                <td>
                                    {emprunt.date_retour_effective 
                                        ? formatDate(emprunt.date_retour_effective) 
                                        : '-'
                                    }
                                </td>
                                <td>
                                    <span 
                                        style={{ 
                                            color: getStatusColor(emprunt.status),
                                            fontWeight: 'bold'
                                        }}
                                    >
                                        {getStatusText(emprunt.status)}
                                    </span>
                                </td>
                                <td>
                                    {emprunt.status !== 'retourné' && (
                                        <button 
                                            onClick={() => handleRetournerClick(emprunt)}
                                            className="return-button"
                                        >
                                            Retourner
                                        </button>
                                    )}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            ) : (
                <p>Aucun emprunt trouvé.</p>
            )}
            
            <button onClick={handleHome}>Retour à l'accueil</button>

            {/* Modal de confirmation pour retourner un livre */}
            {showModal && selectedEmprunt && (
                <div className="modal-overlay" onClick={handleCloseModal}>
                    <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                        <div className="modal-header">
                            <h3>Confirmer le retour</h3>
                            <button className="close-button" onClick={handleCloseModal}>×</button>
                        </div>
                        
                        <div className="modal-body">
                            <div className="book-info">
                                <img src={selectedEmprunt.photo_url} alt={selectedEmprunt.titre} className="modal-book-image" />
                                <div>
                                    <h4>{selectedEmprunt.titre}</h4>
                                    <p><strong>Auteur:</strong> {selectedEmprunt.auteur}</p>
                                    <p><strong>Date d'emprunt:</strong> {formatDate(selectedEmprunt.date_emprunt)}</p>
                                    <p><strong>Date de retour prévue:</strong> {formatDate(selectedEmprunt.date_retour_prevue)}</p>
                                </div>
                            </div>
                            
                            <p style={{ marginTop: '20px', textAlign: 'center' }}>
                                Êtes-vous sûr de vouloir retourner ce livre ?
                            </p>
                            
                            <div className="modal-actions">
                                <button 
                                    type="button" 
                                    onClick={handleCloseModal}
                                    className="cancel-button"
                                >
                                    Annuler
                                </button>
                                <button 
                                    onClick={handleConfirmRetour}
                                    disabled={loading}
                                    className="confirm-button"
                                >
                                    {loading ? 'Retour en cours...' : 'Confirmer le retour'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default EmpruntList
