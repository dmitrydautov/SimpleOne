class UserGroupManager {
  #errorMessages = [];

  /**
   *
   * @param {Object} message - Object which includes User Group code and array of user codes
   * @returns {void}
   * @description - Method gets message and update user groups
   */
  process(message) {
    if (message) {
      this._manageRoles(message)

      if (this.#errorMessages) {
        ss.info(this.#errorMessages.reduce(function (result, value) {
          return result + '\n' + value
        }, 'We have errors in UserGroupManager script:'))
      }
    }
  }

  _manageRoles(message) {
    if (message.GroupCode) {
      const userGroups = this._getUserGroups(message.GroupCode)
      const incomingUsers = this._getUsersForGroup(message.Users)

      this._updateUserRoles(userGroups, incomingUsers);
    }
  }

  _updateUserRoles(userGroups, users) {
    let incomingUserIds = [];
    let userGroupInfo;

    while (users.next()) {
      incomingUserIds.push(users.sys_id);
    }

    while (userGroups.next()) {
      if (incomingUserIds.includes(userGroups.user_id)) {
        if (!userGroupInfo) {
          userGroupInfo = this._getUserGroupInfo(userGroups);
        }

        incomingUserIds = incomingUserIds.map(userId => userId !== userGroups.user_id);
      } else {
        const result = userGroups.deleteRecord();

        if (!result) {
          this.#errorMessages.push(userGroups.getErrors());
        }
      }

      if (incomingUserIds.length > 0) {
        incomingUserIds.forEach(id => this._addToGroup(userGroupInfo, id))
      }
    }
  }

  _addToGroup(useGroupInfo, userId) {
    const userGroup = new SimpleRecord('sys_user_group')
    userGroup.initialize();
    userGroup.user_id = userId;
    userGroup.group_id = useGroupInfo.groupId;
    userGroup.code = useGroupInfo.groupCode;

    const result = userGroup.insert();

    if (result !== 0) {
      this.#errorMessages.push(userGroup.getErrors())
    }
  }

  _getUserGroupInfo(userGroup) {
    return {
      groupCode: userGroup.code,
      groupId: userGroup.groupId
    }
  }

  _getUserGroups(groupCode) {
    const group = new SimpleRecord('GroupCode')
    group.addQuery('code', groupCode)
    group.query()

    return group;
  }

  _getUsersForGroup(incomingUsers) {
    const userCodes = incomingUsers.map(userCode => userCode.Code)

    const users = new SimpleRecord('user')
    users.addQuery('code', 'in', userCodes)
    users.query()

    return users;
  }
}