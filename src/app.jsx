import React, { useState, useEffect } from 'react';
import { initializeApp } from "firebase/app";
import { 
  getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, 
  onAuthStateChanged, signOut 
} from "firebase/auth";
import { 
  getFirestore, doc, setDoc, getDoc, collection, 
  addDoc, query, onSnapshot, where, orderBy 
} from "firebase/firestore";

// --- CONFIGURACIÓN FIREBASE ---
const firebaseConfig = {
  apiKey: "AIzaSyB7NWc1AIHs9UN73-3YtUFECcXDse2JdJo",
  authDomain: "escarola-wellness.firebaseapp.com",
  projectId: "escarola-wellness",
  storageBucket: "escarola-wellness.firebasestorage.app",
  messagingSenderId: "212255082736",
  appId: "1:212255082736:web:66d144fa90308578b75a35"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const MI_LINK_MP = "https://mpago.la/TU_LINK_AQUI";

export default function App() {
  const [user, setUser] = useState(null);
  const [role, setRole] = useState(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [userRole, setUserRole] = useState('alumno');
  const [clases, setClases] = useState([]);
  
  // Estados para Modales
  const [showModalClase, setShowModalClase] = useState(false);
  const [showModalPago, setShowModalPago] = useState(false);
  const [selectedClase, setSelectedClase] = useState(null);

  // Formulario Nueva Clase
  const [nuevaClase, setNuevaClase] = useState({ nombre: '', precio: '' });

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        const snap = await getDoc(doc(db, "users", currentUser.uid));
        setUser(currentUser);
        setRole(snap.data()?.role);
      } else {
        setUser(null);
        setRole(null);
      }
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!user || !role) return;

    const q = role === 'maestro' 
      ? query(collection(db, "clases"), where("maestroId", "==", user.uid))
      : query(collection(db, "clases"), orderBy("creado", "desc"));

    const unsubClases = onSnapshot(q, (snap) => {
      const docs = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      setClases(docs);
    });

    return () => unsubClases();
  }, [user, role]);

  const handleRegister = async () => {
    try {
      const res = await createUserWithEmailAndPassword(auth, email, password);
      await setDoc(doc(db, "users", res.user.uid), { email, role: userRole });
    } catch (e) { alert(e.message); }
  };

  const handleLogin = async () => {
    try { await signInWithEmailAndPassword(auth, email, password); } 
    catch (e) { alert("Error al entrar"); }
  };

  const guardarClase = async () => {
    if (nuevaClase.nombre && nuevaClase.precio) {
      await addDoc(collection(db, "clases"), {
        ...nuevaClase,
        precio: Number(nuevaClase.precio),
        maestroId: user.uid,
        creado: new Date()
      });
      setShowModalClase(false);
      setNuevaClase({ nombre: '', precio: '' });
    }
  };

  if (!user) {
    return (
      <div style={{ padding: '20px', maxWidth: '400px', margin: 'auto' }}>
        <h2>Wellness App - Acceso</h2>
        <input type="email" placeholder="Email" onChange={e => setEmail(e.target.value)} />
        <input type="password" placeholder="Pass" onChange={e => setPassword(e.target.value)} />
        <select onChange={e => setUserRole(e.target.value)}>
          <option value="alumno">Soy Alumno</option>
          <option value="maestro">Soy Maestro</option>
        </select>
        <button onClick={handleLogin}>Entrar</button>
        <button onClick={handleRegister} style={{ background: '#374151' }}>Registrarme</button>
      </div>
    );
  }

  return (
    <div style={{ padding: '20px' }}>
      <header style={{ display: 'flex', justifyContent: 'space-between' }}>
        <h1>Panel {role}</h1>
        <button onClick={() => signOut(auth)}>Salir</button>
      </header>

      {role === 'maestro' && (
        <section>
          <button onClick={() => setShowModalClase(true)}>+ Nueva Clase</button>
          {clases.map(c => (
            <div key={c.id} style={{ border: '1px solid #444', padding: '10px', marginTop: '10px' }}>
              {c.nombre} - ${c.precio}
            </div>
          ))}
        </section>
      )}

      {role === 'alumno' && (
        <section>
          <h3>Clases Disponibles</h3>
          {clases.map(c => (
            <div key={c.id} style={{ border: '1px solid #444', padding: '10px', marginTop: '10px' }}>
              <h4>{c.nombre}</h4>
              <p>${c.precio} MXN</p>
              <button onClick={() => { setSelectedClase(c); setShowModalPago(true); }}>
                Inscribirme y Pagar
              </button>
            </div>
          ))}
        </section>
      )}

      {/* MODAL MAESTRO */}
      {showModalClase && (
        <div style={modalStyle}>
          <div style={modalContentStyle}>
            <h3>Crear Clase</h3>
            <input type="text" placeholder="Nombre" onChange={e => setNuevaClase({...nuevaClase, nombre: e.target.value})} />
            <input type="number" placeholder="Precio" onChange={e => setNuevaClase({...nuevaClase, precio: e.target.value})} />
            <button onClick={guardarClase}>Publicar</button>
            <button onClick={() => setShowModalClase(false)} style={{ background: 'none' }}>Cancelar</button>
          </div>
        </div>
      )}

      {/* MODAL PAGO ALUMNO */}
      {showModalPago && (
        <div style={modalStyle}>
          <div style={modalContentStyle}>
            <h3>Pagar {selectedClase?.nombre}</h3>
            <p>Total: ${selectedClase?.precio} MXN</p>
            <a href={MI_LINK_MP} target="_blank" style={btnPagoStyle}>IR A MERCADO PAGO</a>
            <button onClick={() => setShowModalPago(false)} style={{ marginTop: '15px' }}>Cerrar</button>
          </div>
        </div>
      )}
    </div>
  );
}

// Estilos rápidos en JS
const modalStyle = { position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', background: 'rgba(0,0,0,0.8)', display: 'flex', justifyContent: 'center', alignItems: 'center', z-index: 1000 };
const modalContentStyle = { background: '#202b38', padding: '30px', borderRadius: '15px', textAlign: 'center', width: '90%', maxWidth: '400px' };
const btnPagoStyle = { display: 'block', background: '#009ee3', color: 'white', padding: '10px', borderRadius: '8px', textDecoration: 'none', fontWeight: 'bold' };