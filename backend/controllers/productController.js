import Product from '../models/Product.js';

const getUserId = (req) => req?.user?.id || req?.user?._id;

export const getProducts = async (req, res) => {
  try {
    const userId = getUserId(req);
    if (!userId) return res.status(401).json({ error: 'Not authorized' });
    const products = await Product.find({ userId }).sort({ createdAt: -1 });
    res.json(products);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const addProduct = async (req, res) => {
  try {
    const userId = getUserId(req);
    if (!userId) return res.status(401).json({ error: 'Not authorized' });

    const { name, brand, price, stock, category, image } = req.body;
    if (!name || price === undefined) {
      return res.status(400).json({ error: 'Name and price are required' });
    }

    const newProduct = await Product.create({
      userId,
      name: String(name).trim(),
      brand: brand ? String(brand).trim() : '',
      price: Number(price),
      stock: Number(stock || 0),
      category: category ? String(category).trim() : 'General',
      image: image ? String(image).trim() : ''
    });

    res.status(201).json(newProduct);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const updateProduct = async (req, res) => {
  try {
    const userId = getUserId(req);
    if (!userId) return res.status(401).json({ error: 'Not authorized' });

    const product = await Product.findOne({ _id: req.params.id, userId });
    if (!product) return res.status(404).json({ error: 'Product not found' });

    const { name, brand, price, stock, category, image } = req.body;
    if (name !== undefined) product.name = String(name).trim();
    if (brand !== undefined) product.brand = String(brand).trim();
    if (price !== undefined) product.price = Number(price);
    if (stock !== undefined) product.stock = Number(stock);
    if (category !== undefined) product.category = String(category).trim();
    if (image !== undefined) product.image = String(image).trim();

    await product.save();
    res.json(product);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const deleteProduct = async (req, res) => {
  try {
    const userId = getUserId(req);
    if (!userId) return res.status(401).json({ error: 'Not authorized' });

    const deleted = await Product.findOneAndDelete({ _id: req.params.id, userId });
    if (!deleted) return res.status(404).json({ error: 'Product not found' });

    res.json({ message: 'Product deleted' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

