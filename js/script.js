const aceEditors = {};


document.addEventListener('DOMContentLoaded', function() {
    // Initialize the first Quill editor
    new Quill('.text-editor', {
        theme: 'bubble',
        placeholder: 'Share your knowledge, help others grow.'
    });

    // Add the save button clicking action
    document.getElementById('fileInput').addEventListener('change', loadNotebook);

    // Initialize Ace Editor for existing code-editor sections
    document.querySelectorAll('.code-editor').forEach(editorDiv => {
        // Store the editor instance for later use
        const editorId = generateUniqueId();
        editorDiv.id = editorId;

        // Create Ace Editor in the container
        createAceEditor(editorDiv, editorId);
    });

    // Call the function to populate from query parameters
    populateFromQueryParameters();
});

function generateUniqueId() {
    return 'code_' + Date.now() + '_' + Math.floor(Math.random() * 1000);
}

function createAceEditor(editorDiv, editorId) {
    // Initialize Ace Editor
    const editor = ace.edit(editorDiv, {
        mode: "ace/mode/java",
        placeholder: "Share your code and check it out.",
        minLines: 5,
        maxLines: 50,
        autoScrollEditorIntoView: true
    });
    editor.renderer.setScrollMargin(10, 10, 10, 10);

    // Store the editor instance by the unique ID
    aceEditors[editorId] = editor;

    return editor;
}

function createButtonsDivs(section, type) {
    if (type === 'code') {
        const runButton = document.createElement("button");
        runButton.classList.add("run-button");
        runButton.textContent = "▶";
        runButton.setAttribute("onclick", "runCode(this)");

        // runButton.onclick = function() {
        //     runCode(this);
        // };

        section.appendChild(runButton);
    }

    const buttonsDiv = document.createElement('div');
    buttonsDiv.className = 'section-buttons top-right';
    buttonsDiv.innerHTML = `
        <button class="add-button" onclick="addSection('text', this)">Add Text</button>
        <button class="add-button" onclick="addSection('code', this)">Add Code</button>
        <button class="remove-button" onclick="removeSection(this)">Remove</button>
    `;
    section.appendChild(buttonsDiv);
}

function createTextSection(parent, focusOn) {
    const editorDiv = document.createElement('div');
    editorDiv.className = 'text-editor';
    parent.appendChild(editorDiv);

    // Set the new Quill editor
    let quillEditor = new Quill(editorDiv, {
        theme: 'bubble',
        placeholder: 'Enter your text to share knowledge...'
    });

    // Create text section buttons
    createButtonsDivs(parent, 'text');

    if (focusOn) {
        quillEditor.focus();
    }

    return editorDiv;
}

function createCodeSection(parent, focusOn) {
    const codeSection = document.createElement('div');
    codeSection.className = 'code-section';
    parent.appendChild(codeSection);

    const editorDiv = document.createElement('div');
    editorDiv.className = 'code-editor';

    // Generate and set a unique ID for the editor
    const editorId = generateUniqueId();
    editorDiv.id = editorId;

    codeSection.appendChild(editorDiv);

    // Initialize Ace Editor, and hold the area to focus on
    let aceEditor = createAceEditor(editorDiv, editorId);

    // Create code section buttons
    createButtonsDivs(codeSection, 'code');

    // Focus on the editor
    if (focusOn) {
        aceEditor.focus();
    }

    return aceEditor;
}


window.addSection = function(type, button) {
    const currentSection = button.closest('.editor-section');
    const newSection = document.createElement('div');
    newSection.className = 'editor-section';

    if (type === 'text') {
        createTextSection(newSection, true);
    } else if (type === 'code') {
        createCodeSection(newSection, true);
    }

    currentSection.parentNode.insertBefore(newSection, currentSection.nextSibling);
};

window.removeSection = function(button) {
    const section = button.closest('.editor-section');
    section.parentNode.removeChild(section);
};

window.runCode = async function(button) {
    const codeEditor = button.closest('.editor-section').querySelector('.code-editor');
    const code = aceEditors[codeEditor.id].getValue();

    // Check for an existing result div
    // let resultDiv = button.closest('.editor-section').querySelector('.eval-result');
    let editorSection = button.parentNode.parentNode;
    let resultDiv = editorSection.querySelector(".eval-result")
    if (!resultDiv) {
        // Create a div to display the result if it doesn't exist
        resultDiv = document.createElement('div');
        resultDiv.className = 'eval-result';
        editorSection.appendChild(resultDiv);
    }

    try {
        const response = await fetch('/go', {
                method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                code
            })
        });
        const data = await response.json();

        // Update the content and class of the result div based on the status
        resultDiv.textContent = `Status: ${data.status ? 'Success' : 'Failed'}\nMessage:\n${data.message}`;
        resultDiv.className = data.status ? 'eval-result good' : 'eval-result failed';
    } catch (error) {
        resultDiv.textContent = `Status: Failed\nMessage:\nUh oh, seems like our servers have taken a cat nap!`;
        resultDiv.className = 'eval-result failed';
        console.error('Error running code:', error);
    }
};

function saveNotebook() {
    const sections = document.querySelectorAll('.editor-section');
    const notebookData = Array.from(sections).map(section => {
        // Check for a text editor
        const textEditor = section.querySelector('.text-editor .ql-editor');
        const textContent = textEditor ? textEditor.innerHTML : null;

        // Check for an Ace Editor
        const aceEditorDiv = section.querySelector('.code-editor');
        let codeContent = null;
        if (aceEditorDiv && aceEditorDiv.id && aceEditors[aceEditorDiv.id]) {
            codeContent = aceEditors[aceEditorDiv.id].getValue();
        }

        return { text: textContent, code: codeContent };
    });

    const notebookBlob = new Blob([JSON.stringify(notebookData, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(notebookBlob);
    a.download = 'notebook.json';
    a.click();
}

function loadNotebook() {
    const fileInput = document.getElementById('fileInput');
    if (!fileInput.files.length) {
        return; // No file selected
    }

    const file = fileInput.files[0];
    const reader = new FileReader();

    reader.onload = function(e) {
        const content = JSON.parse(e.target.result);
        recreateEditorSections(content);
    };

    reader.readAsText(file);
}

function recreateEditorSections(content) {
    const editorContainer = document.getElementById('editor-container');
    editorContainer.innerHTML = ''; // Clear existing content

    content.forEach(sectionData => {
        const section = document.createElement('div');
        section.className = 'editor-section';

        if (sectionData.text) {
            let textEditor = createTextSection(section, false);
            textEditor.querySelector('.ql-editor').innerHTML = sectionData.text;
        } else if (sectionData.code) {
            let aceEditor = createCodeSection(section, false);
            aceEditor.setValue(sectionData.code);
        }

        editorContainer.appendChild(section);
    });
}

async function loadRepository() {
    const repoUrl = document.getElementById('reposUrl').value;
    const match = repoUrl.match(/github\.com\/([^/]+)\/([^/]+)/);

    if (match) {
        const owner = match[1];
        const repo = match[2];
        const apiUrl = `https://api.github.com/repos/${owner}/${repo}/contents`;

        // Clear the existing file tree
        const fileTree = document.getElementById('repos-file-tree');
        fileTree.innerHTML = '';

        // Start building the file tree from the root directory
        const subdirectory = await buildFileTree('', apiUrl);
        if (subdirectory) {
            subdirectory.classList.add('repos-list');
            fileTree.appendChild(subdirectory);
        }
    } else {
        alert('Invalid GitHub repository URL format.');
    }
}

// Function to fetch and build the file tree
// async function buildFileTree(path, apiUrl, headers) {
async function buildFileTree(path, apiUrl) {
    try {
        // const response = await fetch(`${apiUrl}/${path}`, { headers });
        const response = await fetch(`${apiUrl}/${path}`);
        const data = await response.json();
        const ul = document.createElement('ul'); // Create a single <ul> for the directory

        for (const item of data) {
            const li = document.createElement('li');
            ul.appendChild(li);

            if (item.type === 'dir') {
                // Add folder icon and class for folders
                // const folderIcon = document.createElement('span');
                // folderIcon.className = 'folder-icon closed';
                // li.appendChild(folderIcon); // Add folder icon to the list item

                // Add a click event to the list item for toggling
                li.addEventListener('click', toggleDirectory);

                // Create a folder name link
                const link = document.createElement('a');
                link.className = 'folder-icon closed';
                link.textContent = item.name;
                li.appendChild(link);

                // Recursively build subdirectory tree and append it
                const subdirectory = await buildFileTree(`${path}/${item.name}`, apiUrl);
                if (subdirectory) {
                    subdirectory.classList.add('hidden');
                    li.appendChild(subdirectory);
                }
            } else {
                // If it's a file, create a file link
                const link = document.createElement('a');
                link.className = 'file-icon';
                link.textContent = item.name;
                // link.href = item.html_url;
                link.setAttribute('notebook-url', `${apiUrl}/${item.path}`); // Store the API URL as a custom attribute
                link.addEventListener('click', handleFileClick);
                li.appendChild(link);
            }
        }

        return ul; // Return the ul for the current directory
    } catch (error) {
        console.error('Error fetching repository data:', error);
        return null;
    }
}

// Function to toggle visibility of subdirectories
function toggleDirectory(event) {
    const folder = event.currentTarget;
    const subdirectory = folder.querySelector('ul');
    if (subdirectory) {
        subdirectory.classList.toggle('hidden');
        folder.classList.toggle('folder-open');
        event.stopPropagation(); // Prevent the click event from propagating to parent folders
    }
}

// Function to handle clicking on a file link
function handleFileClick(event) {
    event.preventDefault(); // Prevent the default navigation behavior

    const fileLink = event.currentTarget;
    const notebookUrl = fileLink.getAttribute('notebook-url');

    // Fetch and handle the GitHub file content as needed
    fetchGitHubFile(notebookUrl);
}

// Function to fetch and handle the GitHub file content
function fetchGitHubFile(apiUrl) {
    // Fetch the file content from the GitHub API using the apiUrl attribute
    fetch(apiUrl)
        .then(response => response.json())
        .then(fileData => {
            // Extract the content and encoding from fileData
            const content = fileData.content;
            const encoding = fileData.encoding;

            // Remove line breaks from content
            const cleanedContent = content.replace(/[\r\n]+/g, '');

            // Decode the content based on the encoding (Base64 in this case)
            const decodedContent = decodeContent(cleanedContent, encoding);

            // Call recreateEditorSections with the decoded content
            recreateEditorSections(JSON.parse(decodedContent));
        })
        .catch(error => {
            console.error('Error fetching and handling the file content:', error);
        });
}

// Function to decode content based on encoding
function decodeContent(content, encoding) {
    if (encoding === 'base64') {
        // Decode Base64 content
        return atob(content);
    } else {
        console.error('Unsupported encoding:', encoding);
        return null;
    }
}

// Function to populate the URL and file tree based on query parameters
async function populateFromQueryParameters() {
    const queryParams = parseQueryString();

    if (queryParams.repos && queryParams.base) {
        const reposUrl = `https://github.com/${queryParams.repos}`;
        const apiUrl = `https://api.github.com/repos/${queryParams.repos}`;

        // Update the URL input field
        const urlInput = document.getElementById('reposUrl');
        urlInput.value = reposUrl;

        // Load and build the file tree using your existing functions
        await loadRepository(reposUrl);

        // Fetch the "index.notebook" file using GitHub REST APIs
        const indexNotebookUrl = `${apiUrl}/contents/index.notebook`;
        try {
            fetchGitHubFile(indexNotebookUrl);
        } catch (error) {
            console.error('Error fetching "index.notebook":', error);
        }
    }
}

// Function to parse the query string parameters
function parseQueryString() {
    const queryString = window.location.search;
    const params = new URLSearchParams(queryString);
    const baseParam = params.get('base');
    const reposParam = params.get('repos');
    return { repos: reposParam, base: baseParam };
}
