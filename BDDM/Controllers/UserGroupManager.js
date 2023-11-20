class UserGroupManager {
  #errorMessages = [];

  /**
   *
   * @param {Object} message - Object which includes User Group code and array of user codes
   * @returns {void}
   * @description - Method gets message and update user groups
   * @return {string} - Errors
   */
  process(message) {
    if (message) {
      try {

        this._manageRoles(JSON.parse(message))
        if (this.#errorMessages.length > 0) {
          const errors = this.#errorMessages.reduce(function (result, value) {
            return result + '\n' + value
          }, 'We have errors in UserGroupManager script:');
          ss.error(errors)
          return errors;
        }
      } catch (e) {
        this.#errorMessages.push('We have errors in UserGroupManager script: ' + e + '\n' + e.stack)
      }
    }
  }

  _manageRoles(message) {
    if (message.GroupCode) {
      const groupId = this._getGroupId(message.GroupCode);
      const userGroups = this._getUserGroups(groupId)
      const incomingUsers = this._getUsersForGroup(message.Users)

      this._updateUserRoles(userGroups, incomingUsers, groupId);
    }
  }

  _updateUserRoles(userGroups, users, groupId) {
    if (userGroups.getRowCount() > 0) {
      const incomingUserIds = [];

      while (users.next()) {
        incomingUserIds.push(users.sys_id);
      }

      while (userGroups.next()) {
        const index = incomingUserIds.indexOf(String(userGroups.user_id));

        if (index !== -1) {
          incomingUserIds.splice(index, 1);
        } else {
          const result = userGroups.deleteRecord(userGroups.sys_id);

          if (!result) {
            this.#errorMessages.push(userGroups.getErrors());
          }
        }

        if (incomingUserIds.length > 0) {
          incomingUserIds.forEach(userId => this._addToGroup(groupId, userId))
        }
      }
    } else {
      while (users.next()) {
        this._addToGroup(groupId, users.sys_id)
      }
    }
  }

  _addToGroup(groupId, userId) {
    const userGroup = new SimpleRecord('sys_user_group')
    userGroup.initialize();
    userGroup.user_id = userId;
    userGroup.group_id = groupId;

    const result = userGroup.insert();

    if (result === '0') {
      this.#errorMessages.push(userGroup.getErrors())
    }
  }

  _getUserGroups(groupId) {
    const group = new SimpleRecord('sys_user_group')
    group.addQuery('group_id', groupId)
    group.query()

    return group;
  }

  _getUsersForGroup(incomingUsers) {
    const userCodes = incomingUsers.map(userCode => userCode.Code)

    const users = new SimpleRecord('user')
    users.addQuery('ad_code', 'in', userCodes)
    users.query()

    return users;
  }

  _getGroupId(code) {
    const group = new SimpleRecord('sys_group');
    group.addQuery('code', code);
    group.query();

    if (group.getRowCount() > 0) {
      group.next();
      return group.sys_id;
    } else {
      throw new Error('There is no group with this code')
    }
  }
}