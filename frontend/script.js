$(document).ready(function () {
  // Initialize variables
  let selectedFiles = [];

  $(window).scroll(function () {
    if ($(window).scrollTop() > 50) {
      $(".navbar").addClass("scrolled");
    } else {
      $(".navbar").removeClass("scrolled");
    }
  });

  function fetchDailyFact() {
    console.log("Fetching daily fact from API...");

    $.ajax({
      url: "http://numbersapi.com/1/30/date?json",
      method: "GET",
      dataType: "json",
      success: function (data) {
        console.log("API Response:", data);

        let factText = data.text || data.number + " is an interesting number!";

        $("#fact-text").html(`
                    <strong>${factText}</strong>
                    <br><br>
                    <em>Did you know? Regular exercise can boost your brain function and improve memory!</em>
                `);

        $("#fact-text").addClass("animate-fade-in");
      },
      error: function (xhr, status, error) {
        console.error("Error fetching fact:", error);

        $("#fact-text").html(`
                    <strong>January 30th marks National Inane Answering Message Day!</strong>
                    <br><br>
                    <em>While that's fun, here's a fitness fact: Just 30 minutes of moderate exercise daily can significantly improve cardiovascular health and reduce stress levels.</em>
                `);

        $("#fact-text").addClass("animate-fade-in");
      },
    });
  }

  fetchDailyFact();

  const dropArea = $("#dropArea");
  const fileInput = $("#fileInput");
  const browseBtn = $("#browseBtn");
  const uploadBtn = $("#uploadBtn");
  const previewContainer = $("#previewContainer");
  const uploadStatus = $("#uploadStatus");

  ["dragenter", "dragover", "dragleave", "drop"].forEach((eventName) => {
    dropArea.on(eventName, preventDefaults);
  });

  function preventDefaults(e) {
    e.preventDefault();
    e.stopPropagation();
  }

  ["dragenter", "dragover"].forEach((eventName) => {
    dropArea.on(eventName, function () {
      $(this).addClass("dragover");
    });
  });

  ["dragleave", "drop"].forEach((eventName) => {
    dropArea.on(eventName, function () {
      $(this).removeClass("dragover");
    });
  });

  dropArea.on("drop", function (e) {
    const dt = e.originalEvent.dataTransfer;
    const files = dt.files;

    handleFiles(files);
  });

  browseBtn.on("click", function () {
    fileInput.click();
  });

  fileInput.on("change", function () {
    handleFiles(this.files);
  });

  function handleFiles(files) {
    selectedFiles = [];
    previewContainer.empty();

    for (let i = 0; i < files.length; i++) {
      const file = files[i];

      if (!file.type.match("image.*")) {
        showUploadStatus(
          "error",
          "Please select only image files (JPG, PNG, GIF)."
        );
        continue;
      }

      if (file.size > 5 * 1024 * 1024) {
        showUploadStatus(
          "error",
          `File "${file.name}" is too large. Maximum size is 5MB.`
        );
        continue;
      }

      selectedFiles.push(file);

      createPreview(file);
    }

    updateUploadButton();

    if (selectedFiles.length > 0) {
      showUploadStatus(
        "success",
        `${selectedFiles.length} image(s) selected. Ready to upload!`
      );
    }
  }

  function createPreview(file) {
    const reader = new FileReader();

    reader.onload = function (e) {
      const previewId =
        "preview-" + Date.now() + "-" + Math.random().toString(36).substr(2, 9);

      const previewHtml = `
                <div class="image-preview-container" data-file="${file.name}">
                    <img src="${e.target.result}" alt="${
        file.name
      }" class="image-preview">
                    <div class="remove-btn" onclick="removePreview('${previewId}', '${
        file.name
      }')">
                        <i class="fas fa-times"></i>
                    </div>
                    <div class="image-name">${file.name.substring(0, 15)}${
        file.name.length > 15 ? "..." : ""
      }</div>
                </div>
            `;

      previewContainer.append(previewHtml);
    };

    reader.readAsDataURL(file);
  }

  window.removePreview = function (previewId, fileName) {
    selectedFiles = selectedFiles.filter((file) => file.name !== fileName);

    $(`.image-preview-container[data-file="${fileName}"]`).remove();

    updateUploadButton();

    if (selectedFiles.length === 0) {
      uploadStatus.hide();
    } else {
      showUploadStatus(
        "success",
        `${selectedFiles.length} image(s) remaining.`
      );
    }
  };

  function updateUploadButton() {
    if (selectedFiles.length > 0) {
      uploadBtn.prop("disabled", false);
      uploadBtn.html(
        `<i class="fas fa-upload me-2"></i> Upload ${selectedFiles.length} Image(s)`
      );
    } else {
      uploadBtn.prop("disabled", true);
      uploadBtn.html('<i class="fas fa-upload me-2"></i> Upload Images');
    }
  }

  function showUploadStatus(type, message) {
    uploadStatus.removeClass("success error progress").addClass(type);
    uploadStatus.html(`
            <div class="d-flex align-items-center">
                <i class="fas fa-${
                  type === "success"
                    ? "check-circle"
                    : type === "error"
                    ? "exclamation-circle"
                    : "spinner fa-spin"
                } me-3"></i>
                <div>
                    <strong>${
                      type.charAt(0).toUpperCase() + type.slice(1)
                    }:</strong> ${message}
                    ${
                      type === "progress"
                        ? '<div class="progress-bar" id="uploadProgress"></div>'
                        : ""
                    }
                </div>
            </div>
        `);
    uploadStatus.show();
  }

  uploadBtn.on("click", function () {
    if (selectedFiles.length === 0) return;

    showUploadStatus("progress", "Uploading images...");

    const formData = new FormData();

    selectedFiles.forEach((file, index) => {
      formData.append("images", file);
    });

    formData.append("timestamp", Date.now());

    $.ajax({
      url: "http://localhost:3000/upload",
      type: "POST",
      data: formData,
      processData: false,
      contentType: false,
      xhr: function () {
        const xhr = new window.XMLHttpRequest();

        xhr.upload.addEventListener(
          "progress",
          function (e) {
            if (e.lengthComputable) {
              const percentComplete = Math.round((e.loaded / e.total) * 100);
              $("#uploadProgress").css("width", percentComplete + "%");

              if (percentComplete === 100) {
                showUploadStatus("progress", "Processing images...");
              }
            }
          },
          false
        );

        return xhr;
      },
      success: function (response) {
        console.log("Upload success:", response);

        if (response.success) {
          showUploadStatus(
            "success",
            `${response.uploadedCount} image(s) uploaded successfully!`
          );

          selectedFiles = [];
          previewContainer.empty();
          updateUploadButton();

          if (response.images && response.images.length > 0) {
            setTimeout(() => {
              showUploadStatus(
                "success",
                `Images saved to: ${response.images.join(", ")}`
              );
            }, 2000);
          }
        } else {
          showUploadStatus(
            "error",
            response.message || "Upload failed. Please try again."
          );
        }
      },
      error: function (xhr, status, error) {
        console.error("Upload error:", error);
        showUploadStatus(
          "error",
          "Server error. Make sure the backend is running on port 3000."
        );

        setTimeout(() => {
          showUploadStatus(
            "success",
            "Demo: Images would be uploaded to server in production."
          );

          selectedFiles = [];
          previewContainer.empty();
          updateUploadButton();
        }, 1500);
      },
    });
  });

  $("a[data-page]").on("click", function (e) {
    e.preventDefault();

    const pageName = $(this).data("page");

    if (pageName !== "home") {
      $("#errorModal").fadeIn(300);

      const pageTitles = {
        workouts: "Workout Plans",
        nutrition: "Nutrition Guide",
        coaching: "1-on-1 Coaching",
        contact: "Contact Us",
        privacy: "Privacy Policy",
        terms: "Terms of Service",
      };

      const title = pageTitles[pageName] || "This Page";
      $(".error-modal-content h3").text(`${title} Under Development`);
      $(".error-modal-content p").text(
        `The ${title.toLowerCase()} section is currently being developed. Our team is working hard to bring you this feature soon!`
      );
    }
  });
  $("#closeErrorBtn").on("click", function () {
    $("#errorModal").fadeOut(300);
  });

  $(window).on("click", function (e) {
    if ($(e.target).hasClass("error-modal")) {
      $("#errorModal").fadeOut(300);
    }
  });

  $('a[href^="#"]').on("click", function (e) {
    if ($(this).data("page") === "home") {
      e.preventDefault();

      const target = $(this).attr("href");

      if (target !== "#") {
        $("html, body").animate(
          {
            scrollTop: $(target).offset().top - 80,
          },
          800
        );
      }
    }
  });

  function animateOnScroll() {
    const elements = $(".animate-fade-in-up, .animate-fade-in");

    elements.each(function () {
      const element = $(this);
      const position = element.offset().top;
      const windowHeight = $(window).height();
      const scrollPosition = $(window).scrollTop();

      if (scrollPosition > position - windowHeight + 100) {
        element.css("animation-delay", element.data("delay") || "0s");
        element.addClass("animate-fade-in-up");
      }
    });
  }

  animateOnScroll();

  $(window).on("scroll", animateOnScroll);

  $('[data-bs-toggle="tooltip"]').tooltip();

  setTimeout(() => {
    $("body").addClass("loaded");
  }, 500);

  console.log(
    "%c👋 Welcome to Click Fit!",
    "color: #d4af37; font-size: 18px; font-weight: bold;"
  );
  console.log(
    "%cA premium fitness website with drag & drop upload and API integration.",
    "color: #6d5ba6;"
  );
});
