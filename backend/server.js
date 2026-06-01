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

console.log('Server starting...');
console.log('Current directory:', __dirname);

//CORS middleware 
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', 'https://sergejc.iti.si');
  res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type');
  next();
});

// Middleware
app.use(bodyParser.json());
app.use('/admin', express.static(path.join(__dirname, 'public'))); // Serve admin files from backend/public/
app.get('/', (req, res) => res.redirect('/admin')); // Redirect root to admin
app.get('/admin', (req, res) => res.sendFile(path.join(__dirname, 'public/admin.html'))); // Explicitly serve admin.html

// Multer setup - accept both main images and testimonial image
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    let dir;
    if (file.fieldname === 'testimonialImage') {
      dir = path.join(__dirname, '../public/assets/img/testimonials');
    } else {
      dir = path.join(__dirname, '../public/assets/img');
    }
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    cb(null, dir);
  },
  filename: (req, file, cb) => cb(null, Date.now() + '-' + file.originalname),
});

const upload = multer({ storage });

// Load projects from JSON
const getProjects = () => {
    const filePath = path.join(__dirname, 'data/projects.json');
    if (!fs.existsSync(filePath)) {
      console.error('projects.json does not exist at:', filePath);
      fs.writeFileSync(filePath, JSON.stringify([], null, 2));
    }
    try {
      const data = fs.readFileSync(filePath);
      return JSON.parse(data);
    } catch (error) {
      console.error('Error reading projects.json:', error.message);
      return [];
    }
  };

// Save projects to JSON - with better error handling
const saveProjects = (projects) => {
  const filePath = path.join(__dirname, 'data/projects.json');
  try {
    const dir = path.dirname(filePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(filePath, JSON.stringify(projects, null, 2));
    console.log('✅ Successfully saved projects to:', filePath);
  } catch (err) {
    console.error('❌ FAILED TO SAVE projects.json:', err.message);
    console.error('Full error:', err);
    throw new Error('Failed to save file: ' + err.message);
  }
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
  const { title, slug, description, client, date, testimonial, testimonialAuthor, testimonialRole } = req.body;
  
  const images = req.files
    .filter(f => f.fieldname === 'images')
    .map(file => `/assets/img/${file.filename}`);

  const testimonialImageFile = req.files.find(f => f.fieldname === 'testimonialImage');
  const testimonialImage = testimonialImageFile 
    ? `/assets/img/testimonials/${testimonialImageFile.filename}` 
    : '';

  const newProject = {
    id: projects.length + 1,
    slug: slug || title.toLowerCase().replace(/ /g, '-'),
    title,
    description,
    client,
    date,
    testimonial,
    testimonialAuthor,
    testimonialRole,
    testimonialImage,        // ← New
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

  const { title, slug, description, client, date, testimonial, testimonialAuthor, testimonialRole } = req.body;
  
  let images = project.images;
  if (req.files && req.files.some(f => f.fieldname === 'images')) {
    images = req.files.filter(f => f.fieldname === 'images')
      .map(file => `/assets/img/${file.filename}`);
  }

  const testimonialImageFile = req.files.find(f => f.fieldname === 'testimonialImage');
  const testimonialImage = testimonialImageFile 
    ? `/assets/img/testimonials/${testimonialImageFile.filename}` 
    : project.testimonialImage;

  Object.assign(project, {
    title: title || project.title,
    slug: slug || project.slug,
    description: description || project.description,
    client: client || project.client,
    date: date || project.date,
    testimonial: testimonial !== undefined ? testimonial : project.testimonial,
    testimonialAuthor: testimonialAuthor !== undefined ? testimonialAuthor : project.testimonialAuthor,
    testimonialRole: testimonialRole !== undefined ? testimonialRole : project.testimonialRole,
    testimonialImage,
    images: images,
    thumbnail: images[0] || project.thumbnail,
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