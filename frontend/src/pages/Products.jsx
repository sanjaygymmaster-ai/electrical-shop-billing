import React, { useState } from 'react';

export default function Products({ products = [], onAdd, onUpdate, onDelete, loading }) {
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ name: '', brand: '', price: '', stock: '', category: '' });
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSaving(true);
    const payload = {
      ...form,
      name: form.name.trim(),
      brand: form.brand.trim(),
      category: form.category.trim(),
      price: Number(form.price),
      stock: Number(form.stock)
    };

    const result = editing
      ? await onUpdate(editing._id, payload)
      : await onAdd(payload);

    if (result?.ok) {
      setForm({ name: '', brand: '', price: '', stock: '', category: '' });
      setShowForm(false);
      setEditing(null);
    } else {
      setError(result?.error || 'Could not save product');
    }
    setSaving(false);
  };

  const handleEdit = (product) => {
    setEditing(product);
    setForm({ name: product.name, brand: product.brand, price: product.price, stock: product.stock, category: product.category });
    setShowForm(true);
  };

  if (loading) return <div className="text-center py-8">Loading...</div>;

  return (
    <div>
      <h1 className="text-2xl font-bold mb-4">Products Management</h1>
      <button
        onClick={() => setShowForm(!showForm)}
        className="bg-blue-600 text-white px-4 py-2 rounded mb-4"
      >
        {showForm ? 'Cancel' : 'Add Product'}
      </button>

      {showForm && (
        <form onSubmit={handleSubmit} className="bg-white p-4 rounded shadow mb-4">
          <div className="grid grid-cols-2 gap-4">
            <input
              type="text"
              placeholder="Name"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              required
              className="border p-2 rounded"
            />
            <input
              type="text"
              placeholder="Brand"
              value={form.brand}
              onChange={(e) => setForm({ ...form, brand: e.target.value })}
              className="border p-2 rounded"
            />
            <input
              type="number"
              placeholder="Price"
              value={form.price}
              onChange={(e) => setForm({ ...form, price: e.target.value })}
              required
              className="border p-2 rounded"
            />
            <input
              type="number"
              placeholder="Stock"
              value={form.stock}
              onChange={(e) => setForm({ ...form, stock: e.target.value })}
              required
              className="border p-2 rounded"
            />
            <input
              type="text"
              placeholder="Category"
              value={form.category}
              onChange={(e) => setForm({ ...form, category: e.target.value })}
              className="border p-2 rounded"
            />
          </div>
          {error ? <div className="text-rose-600 text-sm mt-3">{error}</div> : null}
          <button type="submit" disabled={saving} className="bg-green-600 text-white px-4 py-2 rounded mt-4 disabled:opacity-60">
            {editing ? 'Update' : 'Add'} Product
          </button>
        </form>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {products.map(product => (
          <div key={product._id} className="bg-white p-4 rounded shadow">
            <h3 className="font-semibold">{product.name}</h3>
            <p>Brand: {product.brand}</p>
            <p>Price: ₹{product.price}</p>
            <p>Stock: {product.stock}</p>
            <p>Category: {product.category}</p>
            <div className="mt-2 space-x-2">
              <button onClick={() => handleEdit(product)} className="bg-yellow-500 text-white px-2 py-1 rounded">Edit</button>
              <button onClick={() => onDelete(product._id)} className="bg-red-500 text-white px-2 py-1 rounded">Delete</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
