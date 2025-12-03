import { useState, useEffect, useCallback } from "react";
import { api } from "../services/api";
import "./AdminPanel.css";
import { useToast } from "./Toast";

function AdminPanel({ onClose, userRole, onLogout }) {
  const [activeTab, setActiveTab] = useState("users");
  const [users, setUsers] = useState([]);
  const [pins, setPins] = useState([]);
  const [editingPin, setEditingPin] = useState(null);
  const [pinEditForm, setPinEditForm] = useState({});
  const [donations, setDonations] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [tokenExpired, setTokenExpired] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [editForm, setEditForm] = useState({});
  const [isSaving, setIsSaving] = useState(false);
  const [filterClass, setFilterClass] = useState("");
  const [availableClasses, setAvailableClasses] = useState([]);
  const [permissions, setPermissions] = useState(null);
  const toast = useToast();

  const isSuperadmin = userRole === "superadmin";

  // Load users based on role - returns { users, managedClasses }
  const loadUsers = useCallback(async () => {
    if (isSuperadmin) {
      // Superadmin can see ALL users
      const usersResult = await api.getAllUsers();
      return {
        users: usersResult.data?.users || usersResult.data?.items || [],
        managedClasses: [],
      };
    } else {
      // Admin can only see students in their managed classes
      const permResult = await api.getAdminPermissions();
      const perms = permResult.data;
      setPermissions(perms);

      const managedClasses = perms?.managedClasses || [];
      if (managedClasses.length === 0) {
        return { users: [], managedClasses: [] };
      }

      // Load students from each managed class
      const allUsers = [];
      for (const className of managedClasses) {
        try {
          const classResult = await api.getStudentsByClass(className);
          const classUsers =
            classResult.data?.users || classResult.data?.items || [];
          allUsers.push(...classUsers);
        } catch (e) {
          console.error(`Error loading class ${className}:`, e);
        }
      }
      return { users: allUsers, managedClasses };
    }
  }, [isSuperadmin]);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      // Load users based on role
      const { users: usersList, managedClasses: adminManagedClasses } =
        await loadUsers();
      setUsers(usersList);

      // Extract unique classes for filter
      const classes = [
        ...new Set(
          usersList.filter((u) => u.studentClass).map((u) => u.studentClass)
        ),
      ].sort();
      setAvailableClasses(classes);

      // Load pins based on role
      try {
        let allPins = [];
        if (isSuperadmin) {
          // Superadmin gets ALL pins (no limit)
          const pinsResult = await api.getAllPins(10000);
          allPins = pinsResult.data?.items || [];
        } else {
          // Admin gets pins for their managed classes (no limit)
          for (const className of adminManagedClasses) {
            try {
              const classResult = await api.getPinsByClass(className, 10000);
              const classPins = classResult.data?.items || [];
              allPins.push(...classPins);
            } catch (e) {
              console.error(`Error loading pins for class ${className}:`, e);
            }
          }
        }
        setPins(allPins);
      } catch (e) {
        console.error("Error loading pins:", e);
      }

      // Load donations based on role
      try {
        let allDonations = [];
        if (isSuperadmin) {
          // Superadmin gets ALL donations
          const donationsResult = await api.getAllDonations();
          allDonations =
            donationsResult.data?.donations ||
            donationsResult.data?.items ||
            [];
        } else {
          // Admin gets donations for their managed classes
          for (const className of adminManagedClasses) {
            try {
              const classResult = await api.getDonationsByClass(className);
              const classDonations =
                classResult.data?.donations || classResult.data?.items || [];
              allDonations.push(...classDonations);
            } catch (e) {
              console.error(
                `Error loading donations for class ${className}:`,
                e
              );
            }
          }
        }
        setDonations(allDonations);
      } catch (e) {
        console.error("Error loading donations:", e);
      }
    } catch (err) {
      const errorMessage = err.message || "Помилка завантаження даних";
      // Check if token expired (401 error or specific messages)
      if (
        errorMessage.includes("401") ||
        errorMessage.toLowerCase().includes("unauthorized") ||
        errorMessage.toLowerCase().includes("token") ||
        errorMessage.toLowerCase().includes("expired") ||
        errorMessage.toLowerCase().includes("jwt")
      ) {
        setTokenExpired(true);
      } else {
        setError(errorMessage);
      }
    } finally {
      setIsLoading(false);
    }
  }, [loadUsers, isSuperadmin]);

  // Load data on mount
  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleEditUser = (user) => {
    setEditingUser(user);

    // Get fresh donation data from donations state
    const userId = user.userId || user.id;
    const freshDonation = donationsByUserId[userId];

    // Use fresh donation data if available, otherwise fall back to user data
    const donationAmount =
      freshDonation?.amount ??
      user.donationAmount ??
      user.donation?.amount ??
      0;
    const donationStatus =
      freshDonation?.status ??
      freshDonation?.donationStatus ??
      user.donationStatus ??
      (user.hasDonated ? "verified" : "pending");

    setEditForm({
      name: user.name || "",
      donationAmount: donationAmount,
      hasDonated: user.hasDonated || false,
      donationStatus: donationStatus,
    });
  };

  const handleSaveUser = async () => {
    if (!editingUser) return;

    // Validate based on status
    if (
      editForm.donationStatus === "verified" &&
      editForm.donationAmount <= 0
    ) {
      toast.warning(
        "Для підтвердження благодійного внеску введіть суму більше 0"
      );
      return;
    }

    setIsSaving(true);
    try {
      const userId = editingUser.userId || editingUser.id;

      // Build notes with status info
      const statusText = {
        pending: "Очікує перевірки",
        verified: "Підтверджено",
        rejected: "Відхилено",
      }[editForm.donationStatus];

      // Admin/Superadmin sets donation directly - auto-verified when amount > 0
      await api.setUserDonation(
        userId,
        editForm.donationStatus === "rejected" ? 0 : editForm.donationAmount,
        `Статус: ${statusText}. Встановлено адміністратором.`
      );

      const statusMessage =
        editForm.donationStatus === "verified"
          ? `Благодійний внесок ${editForm.donationAmount} грн підтверджено`
          : editForm.donationStatus === "rejected"
          ? "Благодійний внесок відхилено"
          : "Статус благодійного внеску оновлено";

      toast.success(`${statusMessage} для ${editingUser.name}`);

      // Close modal first
      setEditingUser(null);
      setEditForm({});

      // Force full data reload to get fresh data from backend
      await loadData();
    } catch (err) {
      toast.error(err.message || "Помилка збереження");
    } finally {
      setIsSaving(false);
    }
  };

  const handleResetPassword = async (userId, userName) => {
    const newPassword = prompt(`Введіть новий пароль для ${userName}:`);
    if (!newPassword) return;

    if (newPassword.length < 6) {
      toast.warning("Пароль повинен містити мінімум 6 символів");
      return;
    }

    try {
      await api.resetUserPassword(userId, newPassword);
      toast.success("Пароль успішно змінено");
    } catch (err) {
      toast.error(err.message || "Помилка зміни пароля");
    }
  };

  const handleDeleteUserPermanent = async (user) => {
    const userName = user.name;
    const userId = user.userId || user.id;

    // Double confirmation for destructive action
    const confirmed = window.confirm(
      `УВАГА! Ви збираєтесь НАЗАВЖДИ видалити користувача "${userName}".\n\n` +
        `Це видалить ВСІ дані користувача:\n` +
        `• Профіль\n` +
        `• Благодійні внески\n` +
        `• Результати тестів\n` +
        `• Пригоди (піни)\n` +
        `• Сертифікати\n\n` +
        `Цю дію НЕМОЖЛИВО скасувати!\n\n` +
        `Ви впевнені?`
    );

    if (!confirmed) return;

    // Second confirmation
    const doubleConfirmed = window.confirm(
      `Останнє попередження!\n\n` +
        `Введіть "ТАК" для підтвердження видалення "${userName}"`
    );

    if (!doubleConfirmed) return;

    try {
      // Use appropriate endpoint based on role
      if (isSuperadmin) {
        await api.deleteUserPermanentSuper(userId);
      } else {
        await api.deleteUserPermanent(userId);
      }

      toast.success(`Користувача "${userName}" успішно видалено`);

      // Close modal and reload data
      setEditingUser(null);
      await loadData();
    } catch (err) {
      toast.error(err.message || "Помилка видалення користувача");
    }
  };

  const handleVerifyPin = async (pinId, approved) => {
    try {
      await api.verifyPin(pinId, approved);
      // Update pin status in local state
      setPins((prev) =>
        prev.map((p) => {
          if ((p.id || p.pinId) === pinId) {
            return { ...p, status: approved ? "approved" : "rejected" };
          }
          return p;
        })
      );
    } catch (err) {
      toast.error(err.message || "Помилка верифікації");
    }
  };

  const handleEditPin = (pin) => {
    setEditingPin(pin);
    setPinEditForm({
      description: pin.description || "",
      pinType: pin.pinType || "visited",
      status: pin.status || "pending",
    });
  };

  const handleSavePin = async () => {
    if (!editingPin) return;

    setIsSaving(true);
    try {
      const pinId = editingPin.id || editingPin.pinId;
      await api.updatePin(pinId, pinEditForm);

      // Update local state
      setPins((prev) =>
        prev.map((p) => {
          if ((p.id || p.pinId) === pinId) {
            return { ...p, ...pinEditForm };
          }
          return p;
        })
      );

      setEditingPin(null);
      setPinEditForm({});
      toast.success("Пін успішно оновлено");
    } catch (err) {
      toast.error(err.message || "Помилка оновлення піна");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeletePin = async (pinId) => {
    if (!window.confirm("Ви впевнені, що хочете видалити цей пін?")) return;

    try {
      await api.deleteAdminPin(pinId);
      setPins((prev) => prev.filter((p) => (p.id || p.pinId) !== pinId));
      toast.success("Пін видалено");
    } catch (err) {
      toast.error(err.message || "Помилка видалення піна");
    }
  };

  const handleVerifyDonation = async (userId, amount) => {
    try {
      // Use setUserDonation which auto-verifies
      await api.setUserDonation(userId, amount, "Підтверджено адміністратором");
      // Force full data reload to get fresh data
      await loadData();
    } catch (err) {
      toast.error(err.message || "Помилка верифікації");
    }
  };

  // Create a map of donations by userId for quick lookup
  const donationsByUserId = donations.reduce((acc, donation) => {
    const id = donation.userId;
    if (id) {
      acc[id] = donation;
    }
    return acc;
  }, {});

  // Helper function to get donation info for a user
  const getUserDonationInfo = (user) => {
    const userId = user.userId || user.id;
    const freshDonation = donationsByUserId[userId];

    if (freshDonation) {
      // Use fresh donation data
      const status =
        freshDonation.status ||
        freshDonation.donationStatus ||
        (freshDonation.hasDonated ? "verified" : "pending");
      const isVerified = status === "verified" || freshDonation.hasDonated;
      return {
        status,
        isVerified,
        isPending: status === "pending",
        isRejected: status === "rejected",
        amount: freshDonation.amount || 0,
      };
    }

    // Fallback to user data
    const status =
      user.donationStatus || (user.hasDonated ? "verified" : "none");
    return {
      status,
      isVerified: user.hasDonated || user.donationStatus === "verified",
      isPending: user.donationStatus === "pending",
      isRejected: user.donationStatus === "rejected",
      amount: user.donationAmount || user.donation?.amount || 0,
    };
  };

  const filteredUsers = filterClass
    ? users.filter((u) => u.studentClass === filterClass)
    : users;

  const renderUsersTab = () => (
    <div className="admin-tab-content">
      <div className="admin-filters">
        <select
          value={filterClass}
          onChange={(e) => setFilterClass(e.target.value)}
          className="admin-filter-select"
        >
          <option value="">Всі класи</option>
          {availableClasses.map((cls) => (
            <option key={cls} value={cls}>
              {cls}
            </option>
          ))}
        </select>
        <span className="admin-user-count">
          Знайдено: {filteredUsers.length} користувачів
        </span>
      </div>

      <div className="admin-users-list">
        {filteredUsers.map((user) => {
          const donationInfo = getUserDonationInfo(user);

          return (
            <div key={user.userId} className="admin-user-card">
              <div className="admin-user-info">
                <div className="admin-user-name">{user.name}</div>
                <div className="admin-user-details">
                  <span className="admin-user-type">
                    {user.userType === "student"
                      ? "Учень"
                      : user.userType === "teacher"
                      ? "Вчитель"
                      : "Гість"}
                  </span>
                  {user.studentClass && (
                    <span className="admin-user-class">
                      {user.studentClass}
                    </span>
                  )}
                  <span
                    className={`admin-user-donation ${
                      donationInfo.isVerified
                        ? "donated"
                        : donationInfo.isPending
                        ? "pending"
                        : donationInfo.isRejected
                        ? "rejected"
                        : ""
                    }`}
                  >
                    {donationInfo.isVerified
                      ? `Благодійний внесок: ${donationInfo.amount} грн`
                      : donationInfo.isPending
                      ? "Благодійний внесок очікує"
                      : donationInfo.isRejected
                      ? "Благодійний внесок відхилено"
                      : "Без благодійного внеску"}
                  </span>
                  <span
                    className={`admin-user-tests ${
                      user.passedRegionsCount >= 25
                        ? "all-passed"
                        : user.passedRegionsCount > 0
                        ? "some-passed"
                        : "none-passed"
                    }`}
                  >
                    {user.passedRegionsCount >= 25
                      ? "✓ Всі тести"
                      : user.passedRegionsCount > 0
                      ? `Тести: ${user.passedRegionsCount}/25`
                      : "Тести: 0/25"}
                  </span>
                </div>
              </div>
              <div className="admin-user-actions">
                <button
                  className="admin-btn edit"
                  onClick={() => handleEditUser(user)}
                >
                  Редагувати
                </button>
                <button
                  className="admin-btn password"
                  onClick={() => handleResetPassword(user.userId || user.id, user.name)}
                >
                  Змінити пароль
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );

  const renderPinsTab = () => {
    const pendingCount = pins.filter((p) => p.status === "pending").length;
    const approvedCount = pins.filter((p) => p.status === "approved").length;
    const rejectedCount = pins.filter((p) => p.status === "rejected").length;

    return (
      <div className="admin-tab-content">
        <div className="admin-pin-stats">
          <span className="admin-stat">Всього: {pins.length}</span>
          <span className="admin-stat approved">Схвалено: {approvedCount}</span>
          <span className="admin-stat pending">Очікують: {pendingCount}</span>
          <span className="admin-stat rejected">
            Відхилено: {rejectedCount}
          </span>
        </div>

        {pins.length === 0 ? (
          <div className="admin-empty">Немає пінів</div>
        ) : (
          <div className="admin-pins-list">
            {pins.map((pin) => {
              const pinId = pin.id || pin.pinId;
              const status = pin.status || "pending";
              const isApproved = status === "approved";
              const isPending = status === "pending";
              const isRejected = status === "rejected";

              return (
                <div key={pinId} className={`admin-pin-card ${status}`}>
                  <div className="admin-pin-header">
                    <span className="admin-pin-user">
                      {pin.userDisplayName}
                    </span>
                    <span className={`admin-pin-status ${status}`}>
                      {isApproved
                        ? "✓ Схвалено"
                        : isPending
                        ? "⏳ Очікує"
                        : isRejected
                        ? "✗ Відхилено"
                        : "—"}
                    </span>
                    <span className="admin-pin-region">{pin.regionName}</span>
                  </div>
                  <div className="admin-pin-type">
                    {pin.pinType === "visited"
                      ? "🔴 Був тут"
                      : "🟢 Хочу відвідати"}
                  </div>
                  <div className="admin-pin-description">{pin.description}</div>
                  {pin.images && pin.images.length > 0 && (
                    <div className="admin-pin-images">
                      {pin.images.map((img, idx) => (
                        <img key={idx} src={img} alt={`Pin ${idx + 1}`} />
                      ))}
                    </div>
                  )}
                  <div className="admin-pin-actions">
                    {isPending && (
                      <>
                        <button
                          className="admin-btn approve"
                          onClick={() => handleVerifyPin(pinId, true)}
                        >
                          Схвалити
                        </button>
                        <button
                          className="admin-btn reject"
                          onClick={() => handleVerifyPin(pinId, false)}
                        >
                          Відхилити
                        </button>
                      </>
                    )}
                    <button
                      className="admin-btn edit"
                      onClick={() => handleEditPin(pin)}
                    >
                      Редагувати
                    </button>
                    <button
                      className="admin-btn delete"
                      onClick={() => handleDeletePin(pinId)}
                    >
                      Видалити
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  };

  const renderDonationsTab = () => {
    const pendingCount = donations.filter(
      (d) => d.status === "pending" || d.donationStatus === "pending"
    ).length;
    const verifiedCount = donations.filter(
      (d) =>
        d.status === "verified" ||
        d.donationStatus === "verified" ||
        d.hasDonated
    ).length;

    return (
      <div className="admin-tab-content">
        <div className="admin-donation-stats">
          <span className="admin-stat">Всього: {donations.length}</span>
          <span className="admin-stat verified">
            Підтверджено: {verifiedCount}
          </span>
          <span className="admin-stat pending">Очікують: {pendingCount}</span>
        </div>

        {donations.length === 0 ? (
          <div className="admin-empty">Немає благодійних внесків</div>
        ) : (
          <div className="admin-donations-list">
            {donations.map((donation) => {
              const status =
                donation.status ||
                donation.donationStatus ||
                (donation.hasDonated ? "verified" : "pending");
              const isVerified = status === "verified" || donation.hasDonated;
              const isPending = status === "pending";
              const isRejected = status === "rejected";

              return (
                <div
                  key={donation.donationId || donation.userId || donation.id}
                  className={`admin-donation-card ${status}`}
                >
                  <div className="admin-donation-info">
                    <span className="admin-donation-user">
                      {donation.userName ||
                        donation.userDisplayName ||
                        donation.name}
                    </span>
                    <span className={`admin-donation-status ${status}`}>
                      {isVerified
                        ? "✓ Підтверджено"
                        : isPending
                        ? "⏳ Очікує"
                        : isRejected
                        ? "✗ Відхилено"
                        : "—"}
                    </span>
                    <span className="admin-donation-amount">
                      {donation.amount
                        ? `${donation.amount} грн`
                        : "Сума не вказана"}
                    </span>
                    {donation.studentClass && (
                      <span className="admin-donation-class">
                        {donation.studentClass}
                      </span>
                    )}
                  </div>
                  <div className="admin-donation-actions">
                    <input
                      type="number"
                      placeholder="Сума"
                      className="admin-donation-input"
                      id={`donation-amount-${
                        donation.donationId || donation.userId || donation.id
                      }`}
                      defaultValue={donation.amount || ""}
                    />
                    <button
                      className="admin-btn approve"
                      onClick={() => {
                        const input = document.getElementById(
                          `donation-amount-${
                            donation.donationId ||
                            donation.userId ||
                            donation.id
                          }`
                        );
                        const amount = parseFloat(input.value) || 0;
                        if (amount <= 0) {
                          toast.warning(
                            "Введіть суму благодійного внеску більше 0"
                          );
                          return;
                        }
                        handleVerifyDonation(donation.userId, amount);
                      }}
                    >
                      {isVerified ? "Оновити" : "Підтвердити"}
                    </button>
                    {!isVerified && (
                      <button
                        className="admin-btn reject"
                        onClick={() => {
                          handleVerifyDonation(donation.userId, 0);
                        }}
                      >
                        Відхилити
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="admin-panel-overlay" onClick={onClose}>
      <div
        className="admin-panel-container"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="admin-panel-header">
          <h2 className="admin-panel-title">
            {isSuperadmin
              ? "Панель суперадміністратора"
              : "Панель адміністратора"}
          </h2>
          {!isSuperadmin && permissions?.managedClasses && (
            <span className="admin-panel-subtitle">
              Класи: {permissions.managedClasses.join(", ")}
            </span>
          )}
          <button className="admin-panel-close" onClick={onClose}>
            ✕
          </button>
        </div>

        <div className="admin-tabs">
          <button
            className={`admin-tab ${activeTab === "users" ? "active" : ""}`}
            onClick={() => setActiveTab("users")}
          >
            Користувачі
            <span className="admin-tab-count">{users.length}</span>
          </button>
          <button
            className={`admin-tab ${activeTab === "pins" ? "active" : ""}`}
            onClick={() => setActiveTab("pins")}
          >
            Піни
            {pins.length > 0 && (
              <span className="admin-tab-count">{pins.length}</span>
            )}
          </button>
          <button
            className={`admin-tab ${activeTab === "donations" ? "active" : ""}`}
            onClick={() => setActiveTab("donations")}
          >
            Благодійні внески
            {donations.length > 0 && (
              <span className="admin-tab-count">{donations.length}</span>
            )}
          </button>
        </div>

        <div className="admin-content">
          {isLoading ? (
            <div className="admin-loading">
              <div className="admin-spinner"></div>
              <p>Завантаження...</p>
            </div>
          ) : tokenExpired ? (
            <div className="admin-token-expired">
              <div className="token-expired-icon">⏰</div>
              <h3>Ойой... Вийшов час користування токеном</h3>
              <p>Будь ласка, перезайдіть в свій акаунт знову</p>
              <button
                className="admin-btn relogin"
                onClick={() => {
                  if (onLogout) {
                    onLogout();
                  }
                  onClose();
                }}
              >
                Перезайти
              </button>
            </div>
          ) : error ? (
            <div className="admin-error">
              <p>{error}</p>
              <button className="admin-btn" onClick={loadData}>
                Спробувати знову
              </button>
            </div>
          ) : (
            <>
              {activeTab === "users" && renderUsersTab()}
              {activeTab === "pins" && renderPinsTab()}
              {activeTab === "donations" && renderDonationsTab()}
            </>
          )}
        </div>

        {/* Edit User Modal */}
        {editingUser && (
          <div
            className="admin-edit-overlay"
            onClick={() => setEditingUser(null)}
          >
            <div
              className="admin-edit-modal"
              onClick={(e) => e.stopPropagation()}
            >
              <h3 className="admin-edit-title">
                Редагування: {editingUser.name}
              </h3>

              <div className="admin-edit-info">
                <p>
                  <strong>Тип:</strong>{" "}
                  {editingUser.userType === "student"
                    ? "Учень"
                    : editingUser.userType === "teacher"
                    ? "Вчитель"
                    : "Гість"}
                </p>
                {editingUser.studentClass && (
                  <p>
                    <strong>Клас:</strong> {editingUser.studentClass}
                  </p>
                )}
                <p>
                  <strong>Поточний статус благодійного внеску:</strong>{" "}
                  {editingUser.hasDonated ||
                  editingUser.donationStatus === "verified"
                    ? "Підтверджено"
                    : editingUser.donationStatus === "pending"
                    ? "Очікує перевірки"
                    : editingUser.donationStatus === "rejected"
                    ? "Відхилено"
                    : "Не підтверджено"}
                </p>
                {(editingUser.donationAmount || editingUser.donation?.amount) >
                  0 && (
                  <p>
                    <strong>Сума:</strong>{" "}
                    {editingUser.donationAmount || editingUser.donation?.amount}{" "}
                    грн
                  </p>
                )}
              </div>

              <div className="admin-edit-form">
                <div className="admin-edit-field">
                  <label>Сума благодійного внеску (грн):</label>
                  <input
                    type="number"
                    min="0"
                    step="1"
                    value={editForm.donationAmount}
                    onChange={(e) =>
                      setEditForm({
                        ...editForm,
                        donationAmount: parseFloat(e.target.value) || 0,
                      })
                    }
                    placeholder="Введіть суму"
                  />
                </div>

                <div className="admin-edit-field">
                  <label>Статус благодійного внеску:</label>
                  <select
                    value={editForm.donationStatus}
                    onChange={(e) =>
                      setEditForm({
                        ...editForm,
                        donationStatus: e.target.value,
                      })
                    }
                  >
                    <option value="pending">Очікує перевірки</option>
                    <option value="verified">Підтверджено</option>
                    <option value="rejected">Відхилено</option>
                  </select>
                  <small className="admin-edit-hint">
                    Статус впливає на відображення сертифікату користувачу
                  </small>
                </div>
              </div>

              <div className="admin-edit-actions">
                <button
                  className="admin-btn cancel"
                  onClick={() => setEditingUser(null)}
                  disabled={isSaving}
                >
                  Скасувати
                </button>
                <button
                  className="admin-btn save"
                  onClick={handleSaveUser}
                  disabled={isSaving}
                >
                  {isSaving ? "Збереження..." : "Зберегти"}
                </button>
              </div>

              {/* Permanent delete section */}
              {editingUser.role !== "superadmin" && (
                <div className="admin-delete-section">
                  <div className="admin-delete-warning">
                    <strong>Небезпечна зона</strong>
                    <p>
                      Видалення користувача є незворотнім і призведе до втрати
                      всіх його даних.
                    </p>
                  </div>
                  <button
                    className="admin-btn delete-permanent"
                    onClick={() => handleDeleteUserPermanent(editingUser)}
                    disabled={isSaving}
                  >
                    Видалити назавжди
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Edit Pin Modal */}
        {editingPin && (
          <div
            className="admin-edit-overlay"
            onClick={() => setEditingPin(null)}
          >
            <div
              className="admin-edit-modal"
              onClick={(e) => e.stopPropagation()}
            >
              <h3 className="admin-edit-title">Редагування піна</h3>

              <div className="admin-edit-info">
                <p>
                  <strong>Користувач:</strong> {editingPin.userDisplayName}
                </p>
                <p>
                  <strong>Регіон:</strong> {editingPin.regionName}
                </p>
              </div>

              <div className="admin-edit-form">
                <div className="admin-edit-field">
                  <label>Опис:</label>
                  <textarea
                    value={pinEditForm.description}
                    onChange={(e) =>
                      setPinEditForm({
                        ...pinEditForm,
                        description: e.target.value,
                      })
                    }
                    rows={4}
                    placeholder="Опис піна"
                  />
                </div>

                <div className="admin-edit-field">
                  <label>Тип піна:</label>
                  <select
                    value={pinEditForm.pinType}
                    onChange={(e) =>
                      setPinEditForm({
                        ...pinEditForm,
                        pinType: e.target.value,
                      })
                    }
                  >
                    <option value="visited">Був тут</option>
                    <option value="want_to_visit">Хочу відвідати</option>
                  </select>
                </div>

                <div className="admin-edit-field">
                  <label>Статус:</label>
                  <select
                    value={pinEditForm.status}
                    onChange={(e) =>
                      setPinEditForm({ ...pinEditForm, status: e.target.value })
                    }
                  >
                    <option value="pending">Очікує перевірки</option>
                    <option value="approved">Схвалено</option>
                    <option value="rejected">Відхилено</option>
                  </select>
                </div>
              </div>

              <div className="admin-edit-actions">
                <button
                  className="admin-btn cancel"
                  onClick={() => setEditingPin(null)}
                  disabled={isSaving}
                >
                  Скасувати
                </button>
                <button
                  className="admin-btn save"
                  onClick={handleSavePin}
                  disabled={isSaving}
                >
                  {isSaving ? "Збереження..." : "Зберегти"}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default AdminPanel;
