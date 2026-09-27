"use client";

import { useState } from "react";
import { UserPlus, Trash2, Edit, Loader2, X, Upload, AlertTriangle } from "lucide-react";
import { useRouter } from "next/navigation";
import Image from "next/image";

export function AdminClient({ initialUsers }: { initialUsers: any[] }) {
  const [users, setUsers] = useState(initialUsers);
  
  // Create state
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(false);
  
  // Edit state
  const [editingUser, setEditingUser] = useState<any>(null);
  const [editName, setEditName] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [editPassword, setEditPassword] = useState("");
  const [editIsAdmin, setEditIsAdmin] = useState(false);
  const [editImage, setEditImage] = useState<File | null>(null);
  const [editLoading, setEditLoading] = useState(false);

  // Delete state
  const [userToDelete, setUserToDelete] = useState<any>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const router = useRouter();

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const res = await fetch("/api/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, email, password, isAdmin }),
    });

    if (res.ok) {
      const newUser = await res.json();
      setUsers([newUser, ...users]);
      setName("");
      setEmail("");
      setPassword("");
      setIsAdmin(false);
      router.refresh();
    } else {
      alert("Erro ao criar usuário.");
    }
    setLoading(false);
  };

  const confirmDelete = async () => {
    if (!userToDelete) return;
    setDeleteLoading(true);
    
    const res = await fetch(`/api/users/${userToDelete.id}`, {
      method: "DELETE",
    });

    if (res.ok) {
      setUsers(users.filter(u => u.id !== userToDelete.id));
      setUserToDelete(null);
      router.refresh();
    } else {
      alert("Erro ao remover usuário.");
    }
    setDeleteLoading(false);
  };

  const openEditModal = (user: any) => {
    setEditingUser(user);
    setEditName(user.name);
    setEditEmail(user.email);
    setEditPassword("");
    setEditIsAdmin(user.isAdmin);
    setEditImage(null);
  };

  const closeEditModal = () => {
    setEditingUser(null);
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setEditLoading(true);

    const formData = new FormData();
    formData.append("name", editName);
    formData.append("email", editEmail);
    formData.append("isAdmin", editIsAdmin.toString());
    
    if (editPassword) {
      formData.append("password", editPassword);
    }
    
    if (editImage) {
      formData.append("image", editImage);
    }

    const res = await fetch(`/api/users/${editingUser.id}`, {
      method: "PUT",
      body: formData, // FormData is sent without Content-Type so browser sets boundary automatically
    });

    if (res.ok) {
      const updatedUser = await res.json();
      setUsers(users.map(u => u.id === updatedUser.id ? updatedUser : u));
      closeEditModal();
      router.refresh();
    } else {
      alert("Erro ao atualizar usuário.");
    }
    setEditLoading(false);
  };

  return (
    <div className="flex flex-col gap-8">
      <div className="bg-muted border border-border p-6 rounded-2xl">
        <h2 className="text-xl font-semibold mb-4 text-heading flex items-center gap-2">
          <UserPlus className="w-5 h-5 text-primary" />
          Novo Usuário
        </h2>
        
        <form onSubmit={handleCreate} className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <input
            type="text"
            placeholder="Nome"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            className="w-full px-4 py-2 rounded-xl bg-background border border-border focus:ring-2 focus:ring-primary outline-none"
          />
          <input
            type="email"
            placeholder="E-mail"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="w-full px-4 py-2 rounded-xl bg-background border border-border focus:ring-2 focus:ring-primary outline-none"
          />
          <input
            type="password"
            placeholder="Senha"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            className="w-full px-4 py-2 rounded-xl bg-background border border-border focus:ring-2 focus:ring-primary outline-none"
          />
          
          <label className="flex items-center gap-2 px-2 text-foreground cursor-pointer">
            <input
              type="checkbox"
              checked={isAdmin}
              onChange={(e) => setIsAdmin(e.target.checked)}
              className="w-5 h-5 rounded text-primary focus:ring-primary border-border bg-background"
            />
            Privilégios de Administrador
          </label>

          <button
            type="submit"
            disabled={loading}
            className="md:col-span-2 bg-primary text-white py-3 rounded-xl font-medium mt-2 hover:bg-primary/90 transition-colors flex items-center justify-center"
          >
            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : "Criar Usuário"}
          </button>
        </form>
      </div>

      <div>
        <h2 className="text-xl font-semibold mb-4 text-heading">Usuários Cadastrados</h2>
        <div className="bg-muted border border-border rounded-2xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-black/5 dark:bg-white/5 text-sm uppercase text-muted-foreground">
                <tr>
                  <th className="px-6 py-4 font-semibold">Foto</th>
                  <th className="px-6 py-4 font-semibold">Nome</th>
                  <th className="px-6 py-4 font-semibold">E-mail</th>
                  <th className="px-6 py-4 font-semibold">Nível</th>
                  <th className="px-6 py-4 font-semibold text-right">Ação</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {users.map((user) => (
                  <tr key={user.id} className="hover:bg-black/5 dark:hover:bg-white/5 transition-colors">
                    <td className="px-6 py-4">
                      {user.image ? (
                        <Image src={`/api/images/${user.image}`} alt={user.name} width={40} height={40} className="rounded-full w-10 h-10 object-cover bg-border" unoptimized />
                      ) : (
                        <Image src="/assets/img/brand/nftlogo.webp" alt="Default User" width={40} height={40} className="rounded-full w-10 h-10 object-cover bg-border" />
                      )}
                    </td>
                    <td className="px-6 py-4 text-foreground">{user.name}</td>
                    <td className="px-6 py-4 text-muted-foreground">{user.email}</td>
                    <td className="px-6 py-4">
                      {user.isAdmin ? (
                        <span className="px-2 py-1 bg-primary/20 text-primary rounded-full text-xs font-semibold">Admin</span>
                      ) : (
                        <span className="px-2 py-1 bg-black/10 dark:bg-white/10 text-muted-foreground rounded-full text-xs font-semibold">User</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button 
                        onClick={() => openEditModal(user)}
                        className="text-blue-500 hover:text-blue-600 p-2 rounded-full hover:bg-blue-500/10 transition-colors mr-2"
                        title="Editar usuário"
                      >
                        <Edit className="w-5 h-5" />
                      </button>
                      <button 
                        onClick={() => setUserToDelete(user)}
                        className="text-red-500 hover:text-red-600 p-2 rounded-full hover:bg-red-500/10 transition-colors"
                        title="Excluir usuário"
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Modal de Edição */}
      {editingUser && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-muted border border-border w-full max-w-md rounded-2xl shadow-xl overflow-hidden">
            <div className="flex items-center justify-between p-6 border-b border-border">
              <h3 className="text-xl font-bold text-heading">Editar Usuário</h3>
              <button onClick={closeEditModal} className="text-muted-foreground hover:text-foreground">
                <X className="w-6 h-6" />
              </button>
            </div>
            
            <form onSubmit={handleEditSubmit} className="p-6 flex flex-col gap-4">
              <div className="flex flex-col items-center gap-4 mb-4">
                {editImage ? (
                  <Image src={URL.createObjectURL(editImage)} alt="Preview" width={80} height={80} className="rounded-full w-20 h-20 object-cover bg-border" unoptimized />
                ) : editingUser.image ? (
                  <Image src={`/api/images/${editingUser.image}`} alt={editingUser.name} width={80} height={80} className="rounded-full w-20 h-20 object-cover bg-border" unoptimized />
                ) : (
                  <Image src="/assets/img/brand/nftlogo.webp" alt="Default User" width={80} height={80} className="rounded-full w-20 h-20 object-cover bg-border" />
                )}
                
                <label className="flex items-center gap-2 px-4 py-2 bg-background border border-border rounded-lg cursor-pointer hover:bg-black/5 dark:hover:bg-white/5 transition-colors text-sm">
                  <Upload className="w-4 h-4" />
                  <span>Trocar Foto</span>
                  <input 
                    type="file" 
                    accept="image/png, image/jpeg, image/webp" 
                    className="hidden" 
                    onChange={(e) => setEditImage(e.target.files?.[0] || null)}
                  />
                </label>
              </div>

              <input
                type="text"
                placeholder="Nome"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                required
                className="w-full px-4 py-2 rounded-xl bg-background border border-border focus:ring-2 focus:ring-primary outline-none"
              />
              <input
                type="email"
                placeholder="E-mail"
                value={editEmail}
                onChange={(e) => setEditEmail(e.target.value)}
                required
                className="w-full px-4 py-2 rounded-xl bg-background border border-border focus:ring-2 focus:ring-primary outline-none"
              />
              <input
                type="password"
                placeholder="Nova Senha (deixe em branco para manter)"
                value={editPassword}
                onChange={(e) => setEditPassword(e.target.value)}
                className="w-full px-4 py-2 rounded-xl bg-background border border-border focus:ring-2 focus:ring-primary outline-none"
              />
              
              <label className="flex items-center gap-2 px-2 text-foreground cursor-pointer mt-2">
                <input
                  type="checkbox"
                  checked={editIsAdmin}
                  onChange={(e) => setEditIsAdmin(e.target.checked)}
                  className="w-5 h-5 rounded text-primary focus:ring-primary border-border bg-background"
                />
                Privilégios de Administrador
              </label>

              <button
                type="submit"
                disabled={editLoading}
                className="w-full bg-primary text-white py-3 rounded-xl font-medium mt-4 hover:bg-primary/90 transition-colors flex items-center justify-center"
              >
                {editLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : "Salvar Alterações"}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Modal de Confirmação de Exclusão */}
      {userToDelete && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-muted border border-border w-full max-w-sm rounded-2xl shadow-xl overflow-hidden text-center p-6 flex flex-col items-center">
            <div className="w-16 h-16 rounded-full bg-red-500/10 flex items-center justify-center mb-4">
              <AlertTriangle className="w-8 h-8 text-red-500" />
            </div>
            
            <h3 className="text-xl font-bold text-heading mb-2">Excluir Usuário</h3>
            <p className="text-muted-foreground text-sm mb-6">
              Tem certeza que deseja excluir o usuário <strong>{userToDelete.name}</strong>? Essa ação não pode ser desfeita e ele perderá imediatamente o acesso ao sistema.
            </p>
            
            <div className="flex items-center gap-3 w-full">
              <button
                onClick={() => setUserToDelete(null)}
                className="flex-1 bg-black/5 hover:bg-black/10 dark:bg-white/5 dark:hover:bg-white/10 text-foreground py-3 rounded-xl font-medium transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={confirmDelete}
                disabled={deleteLoading}
                className="flex-1 bg-red-500 hover:bg-red-600 text-white py-3 rounded-xl font-medium transition-colors flex items-center justify-center"
              >
                {deleteLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : "Sim, Excluir"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
