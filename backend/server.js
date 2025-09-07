const express = require('express');
const bodyParser = require('body-parser');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const app = express();
const PORT = 3000;
const SECRET_KEY = 'your-secret-key'; // Change this in production!

// Middleware
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, '../public'))); // Serve static site
app.use('/admin', express.static(path.join(__dirname, 'public'))); // Serve admin panel

// Multer setup for image uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, '../public/assets/img/prenove/'),
  filename: (req, file, cb) => cb(null, Date.now() + '-' + file.originalname),
});
const upload = multer({ storage });

// Load projects from JSON
const getProjects = () => {
    const filePath = path.join(__dirname, 'data/projects.json');
    if (!fs.existsSync(filePath)) {
      fs.writeFileSync(filePath, JSON.stringify([], null, 2));
    }
    const data = fs.readFileSync(filePath);
    return JSON.parse(data);
  };

// Save projects to JSON
const saveProjects = (projects) => {
  fs.writeFileSync(path.join(__dirname, 'data/projects.json'), JSON.stringify(projects, null, 2));
};

// Middleware to verify JWT
const authenticate = (req, res, next) => {
  const token = req.headers['authorization']?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Unauthorized' });
  jwt.verify(token, SECRET_KEY, (err, user) => {
    if (err) return res.status(403).json({ error: 'Invalid token' });
    req.user = user;
    next();
  });
};

app.get('/', (req, res) => res.redirect('/admin'));

// API Routes
// Login
app.post('/api/login', async (req, res) => {
  const { username, password } = req.body;
  // Hardcoded for simplicity (replace with user DB in production)
  const hashedPassword = await bcrypt.hash('admin123', 10); // Demo password
  if (username === 'admin' && await bcrypt.compare(password, hashedPassword)) {
    const token = jwt.sign({ username }, SECRET_KEY, { expiresIn: '1h' });
    res.json({ token });
  } else {
    res.status(401).json({ error: 'Invalid credentials' });
  }
});

// Get all projects
app.get('/api/projects', (req, res) => {
  res.json(getProjects());
});

// Add a project
app.post('/api/projects', authenticate, upload.array('images', 5), (req, res) => {
  const projects = getProjects();
  const { title, description, client, date, testimonial, testimonialAuthor, testimonialRole } = req.body;
  const images = req.files.map(file => `/assets/img/prenove/${file.filename}`);
  const newProject = {
    id: projects.length + 1,
    slug: title.toLowerCase().replace(/ /g, '-'), // e.g., "solski-center-novo-mesto"
    title,
    description,
    client,
    date,
    testimonial,
    testimonialAuthor,
    testimonialRole,
    images,
    thumbnail: images[0] || '/assets/img/default.jpg',
  };
  projects.push(newProject);
  saveProjects(projects);
  res.json(newProject);
});

// Update a project
app.put('/api/projects/:id', authenticate, upload.array('images', 5), (req, res) => {
  const projects = getProjects();
  const id = parseInt(req.params.id);
  const project = projects.find(p => p.id === id);
  if (!project) return res.status(404).json({ error: 'Project not found' });

  const { title, description, client, date, testimonial, testimonialAuthor, testimonialRole } = req.body;
  const images = req.files.length ? req.files.map(file => `/assets/img/prenove/${file.filename}`) : project.images;
  Object.assign(project, {
    title, description, client, date, testimonial, testimonialAuthor, testimonialRole, images,
    thumbnail: images[0] || project.thumbnail,
    slug: title.toLowerCase().replace(/ /g, '-'),
  });
  saveProjects(projects);
  res.json(project);
});

// Delete a project
app.delete('/api/projects/:id', authenticate, (req, res) => {
  const projects = getProjects();
  const id = parseInt(req.params.id);
  const newProjects = projects.filter(p => p.id !== id);
  saveProjects(newProjects);
  res.json({ message: 'Project deleted' });
});

// Serve clean URLs (remove .html)
app.get('/:slug', (req, res) => {
  const projects = getProjects();
  const project = projects.find(p => p.slug === req.params.slug);
  if (project) {
    res.sendFile(path.join(__dirname, '../public/project-details.html'));
  } else {
    res.sendFile(path.join(__dirname, '../public', `${req.params.slug}.html`), err => {
      if (err) res.status(404).send('Page not found');
    });
  }
});

app.listen(process.env.PORT || 3000, () => console.log(`Server running on http://localhost:${process.env.PORT || 3000}`));