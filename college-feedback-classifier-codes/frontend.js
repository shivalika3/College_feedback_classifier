// Enhanced Frontend JavaScript for College Feedback Classifier

document.addEventListener('DOMContentLoaded', function() {
    const feedbackForm = document.getElementById('feedbackForm');
    const loading = document.getElementById('loading');
    const results = document.getElementById('results');
    const searchHistory = document.getElementById('searchHistory');
    const filterCategory = document.getElementById('filterCategory');
    const filterDepartment = document.getElementById('filterDepartment');
    const filterPriority = document.getElementById('filterPriority');

    // Initialize the application
    init();

    function init() {
        updateAnalytics();
        displayHistory();
        setupEventListeners();
    }

    function setupEventListeners() {
        // Form submission
        feedbackForm.addEventListener('submit', handleFormSubmission);
        
        // History filters
        searchHistory.addEventListener('input', filterHistory);
        filterCategory.addEventListener('change', filterHistory);
        filterDepartment.addEventListener('change', filterHistory);
        filterPriority.addEventListener('change', filterHistory);
    }

    async function handleFormSubmission(e) {
        e.preventDefault();
        
        // Show loading state
        loading.classList.add('show');
        results.innerHTML = '<p style="text-align: center; color: #666;">Processing...</p>';
        
        // Get form data
        const formData = new FormData(feedbackForm);
        const feedbackData = {
            studentName: formData.get('studentName') || 'Anonymous',
            department: formData.get('department'),
            year: formData.get('year'),
            urgency: formData.get('urgency'),
            feedbackText: formData.get('feedbackText')
        };
        
        try {
            // Simulate classification (since we don't have a backend)
            const result = await classifyFeedback(feedbackData);
            
            // Save to local storage
            saveFeedback(result);
            
            // Display result
            displayResult(result);
            
            // Update analytics
            updateAnalytics();
            
            // Reset form
            feedbackForm.reset();
            
        } catch (error) {
            console.error('Error:', error);
            results.innerHTML = `
                <div style="color: #e53e3e; text-align: center; padding: 20px;">
                    <i class="fas fa-exclamation-triangle"></i>
                    Error processing feedback. Please try again.
                </div>
            `;
        } finally {
            loading.classList.remove('show');
        }
    }

    // Classification logic: calls the backend, which uses Gemini few-shot prompting
    async function classifyFeedback(feedbackData) {
        const response = await fetch('/api/classify', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(feedbackData)
        });

        if (!response.ok) {
            throw new Error('Classification request failed');
        }

        const data = await response.json();

        return {
            id: Date.now(),
            ...feedbackData,
            category: data.category,
            confidence: data.confidence,
            explanation: data.explanation,
            timestamp: new Date().toISOString(),
            status: 'New'
        };
    }

    function displayResult(result) {
        const categoryClass = `category-${result.category.toLowerCase()}`;
        const categoryIcon = getCategoryIcon(result.category);
        const priorityClass = `priority-${result.urgency.toLowerCase()}`;
        
        results.innerHTML = `
            <div class="classification-result">
                <div style="display: flex; align-items: center; margin-bottom: 10px;">
                    <div class="category-badge ${categoryClass}">
                        <i class="${categoryIcon}"></i> ${result.category}
                    </div>
                    <div class="priority-badge ${priorityClass}">
                        ${result.urgency} Priority
                    </div>
                </div>
                <div class="feedback-text">"${result.feedbackText}"</div>
                <div style="font-size: 14px; color: #666; margin-bottom: 10px;">
                    <strong>Student:</strong> ${result.studentName} | 
                    <strong>Department:</strong> ${result.department} |
                    <strong>Year:</strong> ${result.year}
                </div>
                <div style="margin-top: 15px; padding: 15px; background: #f8f9fa; border-radius: 8px;">
                    <strong>Why this category?</strong><br>
                    ${result.explanation}
                </div>
                <div style="margin-top: 10px; font-size: 12px; color: #999;">
                    Classified on: ${new Date(result.timestamp).toLocaleString()}
                </div>
            </div>
        `;
    }

    function getCategoryIcon(category) {
        const icons = {
            'Academics': 'fas fa-book',
            'Facilities': 'fas fa-building',
            'Administration': 'fas fa-users-cog',
            'General': 'fas fa-comments'
        };
        return icons[category] || 'fas fa-tag';
    }

    function saveFeedback(feedback) {
        let feedbacks = JSON.parse(localStorage.getItem('feedbacks') || '[]');
        feedbacks.unshift(feedback); // Add to beginning
        
        // Keep only last 100 feedbacks
        if (feedbacks.length > 100) {
            feedbacks = feedbacks.slice(0, 100);
        }
        
        localStorage.setItem('feedbacks', JSON.stringify(feedbacks));
    }

    function getFeedbacks() {
        return JSON.parse(localStorage.getItem('feedbacks') || '[]');
    }

    function updateAnalytics() {
        const feedbacks = getFeedbacks();
        const today = new Date().toDateString();
        
        // Calculate statistics
        const totalFeedback = feedbacks.length;
        const todayFeedback = feedbacks.filter(f => 
            new Date(f.timestamp).toDateString() === today
        ).length;
        const highPriority = feedbacks.filter(f => f.urgency === 'High').length;
        
        // Category distribution
        const categoryCount = {
            'Academics': 0,
            'Facilities': 0,
            'Administration': 0,
            'General': 0
        };
        
        feedbacks.forEach(f => {
            if (categoryCount.hasOwnProperty(f.category)) {
                categoryCount[f.category]++;
            }
        });

        // Update statistics display
        document.getElementById('totalFeedback').textContent = totalFeedback;
        document.getElementById('todayFeedback').textContent = todayFeedback;
        document.getElementById('highPriority').textContent = highPriority;
        document.getElementById('avgResponseTime').textContent = '24'; // Mock data

        // Update chart
        const maxCount = Math.max(...Object.values(categoryCount), 1);
        Object.entries(categoryCount).forEach(([category, count]) => {
            const percentage = (count / maxCount) * 100;
            const chartFill = document.querySelector(`.chart-fill.${category.toLowerCase()}`);
            const chartValue = chartFill.parentElement.nextElementSibling;
            
            if (chartFill && chartValue) {
                chartFill.style.width = `${percentage}%`;
                chartValue.textContent = count;
            }
        });
    }

    function displayHistory() {
        const feedbacks = getFeedbacks();
        const historyList = document.getElementById('historyList');
        
        if (feedbacks.length === 0) {
            historyList.innerHTML = `
                <div class="no-results">
                    No feedback history available. Submit some feedback to see it here.
                </div>
            `;
            return;
        }

        const historyHTML = feedbacks.map(feedback => `
            <div class="history-item" data-category="${feedback.category}" data-department="${feedback.department}" data-priority="${feedback.urgency}">
                <div class="history-meta">
                    <div>
                        <span class="category-badge category-${feedback.category.toLowerCase()}">
                            <i class="${getCategoryIcon(feedback.category)}"></i> ${feedback.category}
                        </span>
                        <span class="priority-badge priority-${feedback.urgency.toLowerCase()}">
                            ${feedback.urgency}
                        </span>
                    </div>
                    <div>
                        ${new Date(feedback.timestamp).toLocaleDateString()} - 
                        ${feedback.studentName} (${feedback.department})
                    </div>
                </div>
                <div class="history-feedback">"${feedback.feedbackText}"</div>
                <div style="font-size: 12px; color: #999;">
                    Year: ${feedback.year} | Status: ${feedback.status || 'New'}
                </div>
            </div>
        `).join('');

        historyList.innerHTML = historyHTML;
    }

    function filterHistory() {
        const searchTerm = searchHistory.value.toLowerCase();
        const categoryFilter = filterCategory.value;
        const departmentFilter = filterDepartment.value;
        const priorityFilter = filterPriority.value;
        
        const historyItems = document.querySelectorAll('.history-item');
        let visibleCount = 0;
        
        historyItems.forEach(item => {
            const text = item.textContent.toLowerCase();
            const category = item.dataset.category;
            const department = item.dataset.department;
            const priority = item.dataset.priority;
            
            const matchesSearch = !searchTerm || text.includes(searchTerm);
            const matchesCategory = !categoryFilter || category === categoryFilter;
            const matchesDepartment = !departmentFilter || department === departmentFilter;
            const matchesPriority = !priorityFilter || priority === priorityFilter;
            
            const shouldShow = matchesSearch && matchesCategory && matchesDepartment && matchesPriority;
            
            item.style.display = shouldShow ? 'block' : 'none';
            if (shouldShow) visibleCount++;
        });
        
        // Show no results message if needed
        const historyList = document.getElementById('historyList');
        const noResults = historyList.querySelector('.no-results');
        
        if (visibleCount === 0 && historyItems.length > 0) {
            if (!noResults) {
                historyList.insertAdjacentHTML('beforeend', `
                    <div class="no-results">
                        No feedback matches your current filters.
                    </div>
                `);
            }
        } else if (noResults) {
            noResults.remove();
        }
    }

    // Global functions for buttons
    window.exportData = function() {
        const feedbacks = getFeedbacks();
        const dataStr = JSON.stringify(feedbacks, null, 2);
        const dataBlob = new Blob([dataStr], {type: 'application/json'});
        
        const link = document.createElement('a');
        link.href = URL.createObjectURL(dataBlob);
        link.download = `feedback-data-${new Date().toISOString().split('T')[0]}.json`;
        link.click();
    };

    window.clearAllData = function() {
        if (confirm('Are you sure you want to clear all feedback data? This action cannot be undone.')) {
            localStorage.removeItem('feedbacks');
            updateAnalytics();
            displayHistory();
            results.innerHTML = '<p style="text-align: center; color: #666; font-style: italic;">Submit feedback to see classification results here</p>';
        }
    };

    window.switchTab = function(tabName) {
        // Hide all tab contents
        document.querySelectorAll('.tab-content').forEach(tab => {
            tab.classList.remove('active');
        });
        
        // Remove active class from all nav tabs
        document.querySelectorAll('.nav-tab').forEach(tab => {
            tab.classList.remove('active');
        });
        
        // Show selected tab content
        document.getElementById(`${tabName}-tab`).classList.add('active');
        
        // Add active class to clicked nav tab
        event.target.classList.add('active');
        
        // Refresh data when switching to analytics or history
        if (tabName === 'analytics') {
            updateAnalytics();
        } else if (tabName === 'history') {
            displayHistory();
        }
    };
});