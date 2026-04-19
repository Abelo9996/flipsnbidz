emailjs.init('aTiA22BTw9ab_DQDm');

const manifestForm = document.getElementById('manifestRequestForm');

if (manifestForm) {
    manifestForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        const submitBtn = manifestForm.querySelector('button[type="submit"]');
        const originalText = submitBtn.textContent;
        submitBtn.textContent = 'Sending...';
        submitBtn.disabled = true;

        const selectedCategories = Array.from(manifestForm.querySelectorAll('input[name="manifestCategories"]:checked'))
            .map((input) => input.value)
            .join(', ');

        const formData = {
            name: document.getElementById('manifestName').value,
            company: document.getElementById('manifestCompany').value,
            email: document.getElementById('manifestEmail').value,
            phone: document.getElementById('manifestPhone').value,
            categories: selectedCategories || 'Not specified',
            buying_volume: document.getElementById('manifestVolume').value,
            notes: document.getElementById('manifestNotes').value || 'No additional notes provided.',
            message: `Manifest request from ${document.getElementById('manifestName').value}\nCompany: ${document.getElementById('manifestCompany').value || 'N/A'}\nPhone: ${document.getElementById('manifestPhone').value}\nCategories: ${selectedCategories || 'Not specified'}\nMonthly Volume: ${document.getElementById('manifestVolume').value}\nNotes: ${document.getElementById('manifestNotes').value || 'None'}`,
            to_email: 'flipsnbidz@gmail.com'
        };

        try {
            await emailjs.send('service_exdu8rc', 'template_contact', formData);
            showNotification('Manifest request sent. We will reach out shortly.', 'success');
            manifestForm.reset();
        } catch (error) {
            console.error('❌ Error sending manifest request:', error);
            showNotification('Failed to send request. Please call us at (626) 944-3190 or email flipsnbidz@gmail.com.', 'error');
        } finally {
            submitBtn.textContent = originalText;
            submitBtn.disabled = false;
        }
    });
}
