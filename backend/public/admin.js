let token = null;

async function login() {
  const username = document.getElementById('username').value;
  const password = document.getElementById('password').value;
  const res = await fetch('/api/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password }),
  });
  const data = await res.json();
  if (data.token) {
    token = data.token;
    document.getElementById('login-form').style.display = 'none';
    document.getElementById('admin-content').style.display = 'block';
    loadProjects();
  } else {
    alert(data.error);
  }
}

async function loadProjects() {
  const res = await fetch('/api/projects');
  const projects = await res.json();
  const tbody = document.getElementById('project-list');
  tbody.innerHTML = '';
  projects.forEach(p => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${p.title}</td>
      <td>
        <button onclick="editProject(${p.id})" class="btn btn-sm btn-warning">Edit</button>
        <button onclick="deleteProject(${p.id})" class="btn btn-sm btn-danger">Delete</button>
      </td>`;
    tbody.appendChild(tr);
  });
}

function showAddForm() {
  document.getElementById('form-title').textContent = 'Add Project';
  document.getElementById('form').reset();
  document.getElementById('project-id').value = '';
  document.getElementById('project-form').style.display = 'block';
}

function hideForm() {
  document.getElementById('project-form').style.display = 'none';
}

async function editProject(id) {
  const res = await fetch('https://husnijamiskic-backend.onrender.com/api/projects');
  const projects = await res.json();
  const project = projects.find(p => p.id === id);
  
  if (project) {
    document.getElementById('project-id').value = project.id;
    document.getElementById('title').value = project.title;
    document.getElementById('slug').value = project.slug || '';
    document.getElementById('description').value = project.description;
    document.getElementById('client').value = project.client;
    document.getElementById('date').value = project.date;
    document.getElementById('testimonial').value = project.testimonial || '';
    document.getElementById('testimonialAuthor').value = project.testimonialAuthor || '';
    document.getElementById('testimonialRole').value = project.testimonialRole || '';
    
    document.getElementById('form-title').textContent = 'Edit Project';
    document.getElementById('project-form').style.display = 'block';
  }
}

document.getElementById('form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const id = document.getElementById('project-id').value;
  const formData = new FormData();
  
  formData.append('title', document.getElementById('title').value);
  formData.append('slug', document.getElementById('slug').value);
  formData.append('description', document.getElementById('description').value);
  formData.append('client', document.getElementById('client').value);
  formData.append('date', document.getElementById('date').value);
  formData.append('testimonial', document.getElementById('testimonial').value || '');
  formData.append('testimonialAuthor', document.getElementById('testimonialAuthor').value || '');
  formData.append('testimonialRole', document.getElementById('testimonialRole').value || '');

  const files = document.getElementById('images').files;
  for (let file of files) formData.append('images', file);

  const url = id ? `https://husnijamiskic-backend.onrender.com/api/projects/${id}` : 'https://husnijamiskic-backend.onrender.com/api/projects';
  const method = id ? 'PUT' : 'POST';

  try {
    const res = await fetch(url, {
      method: method,
      headers: { 'Authorization': `Bearer ${token}` },
      body: formData,
    });

    const data = await res.text();   // Changed to text to see raw error

    if (res.ok) {
      loadProjects();
      hideForm();
      alert('Project saved successfully!');
    } else {
      alert('Server Error: ' + data);
      console.error('Server response:', data);
    }
  } catch (err) {
    alert('Connection error - check console');
    console.error(err);
  }
});

async function deleteProject(id) {
  if (confirm('Are you sure?')) {
    await fetch(`/api/projects/${id}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${token}` },
    });
    loadProjects();
  }
}

window.onload = () => loadProjects();