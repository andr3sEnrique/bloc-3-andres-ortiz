import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import './../styles/booklist.css'

const BookList = () => {
    const navigate = useNavigate()
    const [books, setBooks] = useState([])
    const [userRole, setUserRole] = useState('')
    const [showModal, setShowModal] = useState(false)
    const [selectedBook, setSelectedBook] = useState(null)
    const [returnDate, setReturnDate] = useState('')
    const [loading, setLoading] = useState(false)
    const base = import.meta.env.VITE_BASE_URL || '/'

    useEffect(() => {
        fetch(base+'api/books', {
            credentials: 'include'
        })
            .then(response => response.json())
            .then(data => setBooks(data))
            .catch(error => console.error('Erreur:', error))
        fetch(base+'api/session', {
            credentials: 'include'
        })
            .then(response => {
                if(response.status === 200) return response.json()
                else throw new Error("Account not found")
            })
            .then(data => setUserRole(data.user.role || 'Guest'))
            .catch(error => setUserRole('Guest'))

        console.log(userRole)
    }, [])

    const handleAddBook = () => {
        navigate('/add_book')
    }

    const handleHome = () => {
        navigate('/')
    }

    const handleEmprunterClick = (book) => {
        setSelectedBook(book)
        setShowModal(true)
        // Calcular fecha mínima (hoy) y máxima (30 días)
        const today = new Date()
        const maxDate = new Date()
        maxDate.setDate(today.getDate() + 30)
        
        // Establecer fecha por defecto a 14 días
        const defaultDate = new Date()
        defaultDate.setDate(today.getDate() + 14)
        setReturnDate(defaultDate.toISOString().split('T')[0])
    }

    const handleCloseModal = () => {
        setShowModal(false)
        setSelectedBook(null)
        setReturnDate('')
    }

    const handleSubmitEmprunt = async (e) => {
        e.preventDefault()
        setLoading(true)

        try {
            const response = await fetch(base + 'api/emprunts', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    livre_id: selectedBook.id,
                    date_retour_prevue: returnDate
                }),
                credentials: 'include'
            })

            if (response.ok) {
                const result = await response.json()
                alert('Livre emprunté avec succès!')
                
                // Actualizar la lista de libros
                setBooks(books.map(book => 
                    book.id === selectedBook.id 
                        ? { ...book, statut: 'emprunté' }
                        : book
                ))
                
                handleCloseModal()
            } else {
                const error = await response.json()
                alert('Erreur: ' + (error.error || 'Impossible d\'emprunter le livre'))
            }
        } catch (error) {
            console.error('Erreur:', error)
            alert('Erreur lors de l\'emprunt du livre')
        } finally {
            setLoading(false)
        }
    }

    // Calculer les dates min et max pour l'input
    const today = new Date().toISOString().split('T')[0]
    const maxDate = new Date()
    maxDate.setDate(new Date().getDate() + 30)
    const maxDateString = maxDate.toISOString().split('T')[0]

    return (
        <div className="container">
            <h2>Liste des Livres - Librairie XYZ</h2>
            {books.length > 0 ? (
                <table>
                    <thead>
                        <tr>
                            <th>Image</th>
                            <th>Titre</th>
                            <th>Auteur</th>
                            <th>Date de publication</th>
                            <th>Statut</th>
                            <th>Détails</th>
                            {userRole === 'utilisateur' && (
                                <th>Emprunter</th>
                            )}
                        </tr>
                    </thead>
                    <tbody>
                        {books.map(book => (
                            <tr key={book.id}>
                                <td><img className="book-image" src={book.photo_url} alt={book.titre} /></td>
                                <td>{book.titre}</td>
                                <td>{book.auteur}</td>
                                <td>{book.date_publication}</td>
                                <td>{book.statut}</td>
                                <td><a href={`${base}book/${book.id}`}>Voir les détails</a></td>
                                {userRole === 'utilisateur' && (
                                     <td><button onClick={() => handleEmprunterClick(book)}>Emprunter</button></td>
                                )}
                            </tr>
                        ))}
                    </tbody>
                </table>
            ) : (
                <p>Erreur lors de la récupération des livres.</p>
            )}
            {userRole === 'admin' && (
                <button onClick={handleAddBook}>Ajouter un livre</button>
            )}
            <button onClick={handleHome}>Retour à l'accueil</button>

            {/* Modal pour emprunter un livre */}
            {showModal && (
                <div className="modal-overlay" onClick={handleCloseModal}>
                    <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                        <div className="modal-header">
                            <h3>Emprunter le livre</h3>
                            <button className="close-button" onClick={handleCloseModal}>×</button>
                        </div>
                        
                        {selectedBook && (
                            <div className="modal-body">
                                <div className="book-info">
                                    <img src={selectedBook.photo_url} alt={selectedBook.titre} className="modal-book-image" />
                                    <div>
                                        <h4>{selectedBook.titre}</h4>
                                        <p><strong>Auteur:</strong> {selectedBook.auteur}</p>
                                        <p><strong>ISBN:</strong> {selectedBook.isbn}</p>
                                    </div>
                                </div>
                                
                                <form onSubmit={handleSubmitEmprunt}>
                                    <div className="form-group">
                                        <label htmlFor="returnDate">Date de retour prévue:</label>
                                        <input
                                            type="date"
                                            id="returnDate"
                                            value={returnDate}
                                            onChange={(e) => setReturnDate(e.target.value)}
                                            min={today}
                                            max={maxDateString}
                                            required
                                        />
                                        <small className="help-text">
                                            Vous pouvez emprunter ce livre pour un maximum de 30 jours.
                                        </small>
                                    </div>
                                    
                                    <div className="modal-actions">
                                        <button 
                                            type="button" 
                                            onClick={handleCloseModal}
                                            className="cancel-button"
                                        >
                                            Annuler
                                        </button>
                                        <button 
                                            type="submit" 
                                            disabled={loading}
                                            className="confirm-button"
                                        >
                                            {loading ? 'Emprunt en cours...' : 'Confirmer l\'emprunt'}
                                        </button>
                                    </div>
                                </form>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default BookList
